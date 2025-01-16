import path from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import log from 'electron-log';


import { CreateDirectoryTask } from './tasks/directory.js';
import { DownloadTask } from './tasks/download.js';
import { RasterizeLAZTask, MergeLAZTask, OptimizeLAZTask } from './tasks/pdal.js';
import { CreateCSVTask } from './tasks/stats.js';
import {
  GeoTiffFillNoDataTask,
  GeoTiffStatsTask,
  GeoTiffToRaw,
  GenerateSatelliteImageryTask,
  GenerateHillShadeImageTask,
  GenerateShapefilesTask
} from './tasks/gdal.js';
import { addKilometers, getBoundsForDistance, reprojectBounds, WGS84 } from './utils/geo.js';

const JobStates = {
  Queued: 'queued',
  Running: 'running',
  Canceled: 'canceled',
  Error: 'error',
  Finished: 'finished'
}

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
    this.emit('progress', this.progress);
  }

  updateProgress({ id, label, percent }) {
    this.progress = { id, label, percent };
    this.emit('progress', this.progress);
    // this.update();
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

    this.courseDirectory = this.data.outputFolder;
    log.info(`Using course directory: ${this.courseDirectory}`);

    this.state = JobStates.Running;
    const downloadDirectory = path.join(this.courseDirectory, 'Downloads');
    const lazDataDirectory = path.join(this.courseDirectory, 'LAS');
    const rawDataDirectory = path.join(this.courseDirectory, 'RAW');
    const tiffDirectory = path.join(this.courseDirectory, 'TIFF');
    const overlaysDirectory = path.join(this.courseDirectory, 'Overlays');
    const shapefilesDirectory = path.join(this.courseDirectory, 'Shapefiles');


    // const isLAZInput = this.data.dataSource?.format === 'LAZ';
    // const isTIFFInput = this.data.dataSource?.format === 'GeoTIFF';
    const isOuterEnabled = this.data.coordinates.outer?.length;

    const cropCoordinates = isOuterEnabled ? this.data.coordinates.outer : this.data.coordinates.inner;



    const [first] = this.data.dataSource.items;
    this.data._inputCRS = first.crs;
    const code = `${first.crs.id.authority}:${first.crs.id.code}`;
    this.data._inputSRS = code;
    this.data._containsMixedProjections = this.data.dataSource.items.some(item => this.data._inputSRS !== code);


    const [nativeCenter] = reprojectBounds(WGS84, this.data._inputCRS.proj4, this.data.coordinates.center);

    this.data._bounds = {
      center: nativeCenter,
      inner: getBoundsForDistance(nativeCenter, this.data.distance, this.data._inputCRS.unit),
      ...this.data.outerDistance ? {
        outer: getBoundsForDistance(nativeCenter, this.data.distance + this.data.outerDistance, this.data._inputCRS.unit),
      } : {}
    };

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

      new CreateDirectoryTask({
        directory: lazDataDirectory
      }),

      new DownloadTask({
        downloadDirectory
      }),

      new MergeLAZTask({
        coordinates: cropCoordinates,
        outputDirectory: lazDataDirectory
      }),

      new OptimizeLAZTask({
        outputDirectory: lazDataDirectory
      }),

      new RasterizeLAZTask({
        prefix: 'inner',
        resolution: this.data.resolution.inner,
        outputDirectory: tiffDirectory,
        coordinates: this.data._bounds.inner,
        distance: this.data.distance
      }),

      new GeoTiffFillNoDataTask({
        prefix: 'inner',
        resolution: this.data.resolution.inner,
        coordinates: this.data._bounds.inner,
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

      ...(this.data.tasksEnabled.overlays.google || this.data.tasksEnabled.overlays.bing) ? [
        new GenerateSatelliteImageryTask({
          prefix: 'inner',
          outputDirectory: overlaysDirectory,
          // coordinates: this.data.coordinates.inner,
          coordinates: this.data._bounds.inner,
          tasksEnabled: this.data.tasksEnabled
        }),
      ] : [],


      new CreateDirectoryTask({
        directory: shapefilesDirectory
      }),

      new GenerateShapefilesTask({
        prefix: 'inner',
        outputDirectory: shapefilesDirectory,
        // coordinates: this.data.coordinates.inner,
        coordinates: this.data._bounds.inner,
        tasksEnabled: this.data.tasksEnabled
      }),

      ...isOuterEnabled ? [
        new RasterizeLAZTask({
          prefix: 'outer',
          resolution: this.data.resolution.outer,
          outputDirectory: tiffDirectory,
          coordinates: this.data._bounds.outer
        }),
        new GeoTiffFillNoDataTask({
          prefix: 'outer',
          resolution: this.data.resolution.outer,
          coordinates: this.data._bounds.outer,
          outputDirectory: tiffDirectory
        }),
        new GeoTiffStatsTask({ prefix: 'outer' }),
        new GeoTiffToRaw({
          prefix: 'outer',
          outputDirectory: rawDataDirectory
        }),
        ...(this.data.tasksEnabled.google || this.data.tasksEnabled.bing) ? [
          new GenerateSatelliteImageryTask({
            prefix: 'outer',
            outputDirectory: overlaysDirectory,
            // coordinates: this.data.coordinates.outer,
            coordinates: this.data._bounds.outer,
            tasksEnabled: this.data.tasksEnabled
          }),
        ] : [],

        new GenerateShapefilesTask({
          prefix: 'outer',
          outputDirectory: shapefilesDirectory,
          // coordinates: this.data.coordinates.outer,
          coordinates: this.data._bounds.outer,
          tasksEnabled: this.data.tasksEnabled
        }),

      ] : [],


      ...this.data.tasksEnabled.hillshade ? [
        new GenerateHillShadeImageTask({
          outputDirectory: overlaysDirectory
        }),
      ] : [],

      new CreateCSVTask({
        outputDirectory: this.courseDirectory
      })

    ].filter(Boolean);

    let pipelineError;
    const pipelineWarnings = [];
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
      try {
        await task.process(this.data);
        const take = Date.now() - started;
        log.info(`Finished task ${task.id} in ${(take / 1000).toFixed(2)} seconds`);

        if (this.state === JobStates.Canceled || task.exitOnComplete) {
          break;
        }
      } catch (error) {
        if (task.warnOnError === true) {
          log.error(`[${task.id}] Task warning!`, error);
          pipelineWarnings.push(`${error.message}`);
          continue;
        }
        log.error(`[${task.id}] Task error!`, error);
        pipelineError = error?.message || `An unknown error occurred during the ${task.id} task`;
        this.emit('error', pipelineError);
        return;
      }
    }

    if (!pipelineError && this.state === JobStates.Running) {
      log.info('finished?');
      this.emit('finished', { ...this.data, warnings: pipelineWarnings });
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