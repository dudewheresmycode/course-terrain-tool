import path from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import log from 'electron-log';

// import { lazToTiff } from './server/lib/steps/pdal.js';
// import {
//   fillNoData,
//   getGeoTiffStats,
//   geoTIFFHillShade,
//   generateSatelliteForSource,
//   geoTiffToRaw
// } from './server/lib/steps/gdal.js';
// import mkdirSafe from './utils/mkdirSafe.js';
// import { tools } from './tools/index.js';

import { CreateDirectoryTask } from './tasks/directory.js';
import { DownloadTask } from './tasks/download.js';
import { RasterizeLAZTask, MergeLAZTask } from './tasks/pdal.js';
import { CreateCSVTask } from './tasks/stats.js';
import {
  GeoTiffFillNoDataTask,
  GeoTiffStatsTask,
  GeoTiffToRaw,
  GenerateSatelliteImageryTask,
  GenerateHillShadeImageTask
} from './tasks/gdal.js';


// const SATELLITE_SOURCES = [
//   'google',
//   // 'bing'
// ];

const JobStates = {
  Queued: 'queued',
  Running: 'running',
  Canceled: 'canceled',
  Error: 'error',
  Finished: 'finished'
}

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))



export class Job extends EventEmitter {
  constructor(data, outputFolder) {
    super();
    this.id = randomUUID();
    this.data = { ...data, _outputFiles: { inner: {}, outer: {} } };
    this.assets = [];
    this.progress = { step: 'created', label: 'Waiting for job to start' };
    this.state = JobStates.Queued;

    if (outputFolder) {
      this.data.outputFolder = outputFolder;
    }
  }

  update() {
    this.emit('progress', {
      state: this.state,
      data: this.data,
      progress: this.progress,
      ...this.error && { error: this.error }
    });
  }

  updateProgress({ id, label, percent }) {
    this.progress = { id, label, percent };
    this.update();
    log.info(`[${id}]${percent ? '[' + percent.toFixed(1) + '%]' : ''} ${label}`);
  }

  cancel() {
    this.state = JobStates.Canceled;
    if (this.activeTask) {
      this.activeTask.cancel();
    }
  }

  async process() {
    // safety checks
    if (!this.data.outputFolder) {
      throw new Error('Missing outputDirectory. Unable to continue');
    }
    if (!this.data.dataSource?.format) {
      throw new Error('Missing valid data source format!');
    }

    this.courseDirectory = this.data.outputFolder;
    log.info(`Using course directory: ${this.courseDirectory}`);

    this.state = JobStates.Running;
    const downloadDirectory = path.join(this.courseDirectory, 'Downloads');
    const lazDataDirectory = path.join(this.courseDirectory, 'LAS');
    const rawDataDirectory = path.join(this.courseDirectory, 'RAW');
    const tiffDirectory = path.join(this.courseDirectory, 'TIFF');
    const overlaysDirectory = path.join(this.courseDirectory, 'Overlays');


    const isLAZInput = this.data.dataSource?.format === 'LAZ';
    // const isTIFFInput = this.data.dataSource?.format === 'GeoTIFF';
    const isOuterEnabled = this.data.coordinates.outer?.length;

    const cropCoordinates = isOuterEnabled ? this.data.coordinates.outer : this.data.coordinates.inner;

    const taskPipeline = [
      new CreateDirectoryTask({
        directory: this.courseDirectory
      }),
      new CreateDirectoryTask({
        directory: downloadDirectory
      }),
      new CreateDirectoryTask({
        directory: tiffDirectory
      }),
      isLAZInput && new CreateDirectoryTask({
        directory: lazDataDirectory
      }),

      new DownloadTask({
        // sources: this.data.dataSource.items,
        downloadDirectory
      }),

      ...isLAZInput ? [
        new MergeLAZTask({
          // items: this.data.dataSource.items,
          coordinates: cropCoordinates,
          outputDirectory: lazDataDirectory
        }),
        // const tiff = await lazToTiff(mergedPointCloud, filenamePrefix, resolution, outputDirectory, coordinates);
        new RasterizeLAZTask({
          prefix: 'inner',
          resolution: this.data.resolution.inner,
          outputDirectory: tiffDirectory,
          coordinates: this.data.coordinates.inner
        }),
        new GeoTiffFillNoDataTask({
          prefix: 'inner',
          resolution: this.data.resolution.inner,
          outputDirectory: tiffDirectory
        }),

        new GeoTiffStatsTask({ prefix: 'inner' }),

        new CreateDirectoryTask({
          directory: rawDataDirectory
        }),
        new GeoTiffToRaw({
          prefix: 'inner',
          outputDirectory: rawDataDirectory
        }),

        new CreateDirectoryTask({
          directory: overlaysDirectory
        }),
        new GenerateSatelliteImageryTask({
          prefix: 'inner',
          outputDirectory: overlaysDirectory,
          coordinates: this.data.coordinates.inner
        }),

        ...isOuterEnabled ? [
          new RasterizeLAZTask({
            prefix: 'outer',
            resolution: this.data.resolution.outer,
            outputDirectory: tiffDirectory,
            coordinates: this.data.coordinates.outer
          }),
          new GeoTiffFillNoDataTask({
            prefix: 'outer',
            resolution: this.data.resolution.outer,
            outputDirectory: tiffDirectory
          }),
          new GeoTiffStatsTask({ prefix: 'outer' }),
          new GeoTiffToRaw({
            prefix: 'outer',
            outputDirectory: rawDataDirectory
          }),
          new GenerateSatelliteImageryTask({
            prefix: 'outer',
            outputDirectory: overlaysDirectory,
            coordinates: this.data.coordinates.outer
          }),
        ] : [],


        new GenerateHillShadeImageTask({
          outputDirectory: overlaysDirectory
        }),

        new CreateCSVTask({
          outputDirectory: this.courseDirectory
        })

      ] : [],

    ].filter(Boolean);

    // let previousTaskOutput;
    for (const task of taskPipeline) {
      this.activeTask = task;
      task.on('progress', (label, percent) => {
        this.updateProgress({ id: task.id, label, percent });
      });

      const started = Date.now();
      log.info(`Running task ${task.id}`);
      this.updateProgress({ id: task.id, label: task.label || `Running the task ${task.id}` });
      // run task
      await task.process(this.data);

      log.info(`Finished task ${task.id} in ${(started / 1000).toFixed(2)} seconds`);

      if (this.state === JobStates.Canceled) {
        break;
      }
    }

    if (this.state === JobStates.Running) {
      log.info('finished?');
      this.emit('finished', this.data);
    }

  }

}

export class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.activeJob = undefined;
  }

  getJob(jobId) {
    return this.queue.find(job => job.id === jobId);
  }

  add(data) {
    const job = new Job(data);
    this.queue.push(job);
    this.checkQueue();
    return job;
  }

  checkQueue() {
    if (this.activeJob) {
      return;
    }
    const [nextJob] = this.queue.filter(job => job.state === JobStates.Queued);
    if (nextJob) {
      this.activeJob = nextJob;
      this.runJob();
    }
  }

  cancelJob() {
    if (!this.activeJob) {
      return;
    }
    this.activeJob.cancel();
  }

  async runJob() {
    if (!this.activeJob) {
      return;
    }
    try {
      await this.activeJob.process();
    } catch (error) {
      log.error(error);
      this.activeJob.emit('error', error.message || 'An unknown error occurred. Please check the logs.');
    }
    this.activeJob = undefined;
  }
}