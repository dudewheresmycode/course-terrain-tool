import path from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import log from 'electron-log';
import proj4 from 'proj4';


import { CreateDirectoryTask } from './tasks/directory.js';
import { DownloadTask } from './tasks/download.js';
import { RasterizeLAZTask, MergeLAZTask, OptimizeLAZTask } from './tasks/pdal.js';
import { CreateCSVTask } from './tasks/stats.js';
import { CreateSVGTask } from './tasks/svg.js';
import {
  GeoTiffFillNoDataTask,
  GeoTiffStatsTask,
  GeoTiffToRaw,
  GenerateSatelliteImageryTask,
  GenerateHillShadeImageTask,
  GenerateShapefilesTask
} from './tasks/gdal.js';
import { addKilometers, getBoundsForDistance, reprojectBounds, EPSG_4326, WGS84 } from './utils/geo.js';

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

    // re-project the center point to our data source's CRS
    const nativeCenter = proj4(
      EPSG_4326,
      this.data._inputCRS.proj4,
      this.data.coordinates.center
    );

    // calculate a new bounding box in the native coordinate system
    // NOTE: the box we define on the map is just a guide and won't be perfectly accurate to the actual box
    // but we'll use this calculated box for every step so that all assets should line up later
    this.data._bounds = {
      center: nativeCenter,
      // inner: nativeInner,
      inner: getBoundsForDistance(nativeCenter, this.data.distance, this.data._inputCRS),
      ...this.data.outerDistance ? {
        outer: getBoundsForDistance(nativeCenter, this.data.distance + this.data.outerDistance, this.data._inputCRS),
        // outer: nativeOuter
      } : {}
    };

    console.log('this.data._bounds', this.data._bounds);

    const terrainDataTasks = [
      new CreateDirectoryTask({
        directory: downloadDirectory
      }),
      new CreateDirectoryTask({
        directory: tiffDirectory
      }),

      new CreateDirectoryTask({
        directory: lazDataDirectory
      }),

      // generate shapefiles
      ...this.data.tasksEnabled.shapefiles ? [
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
          new GenerateShapefilesTask({
            prefix: 'outer',
            outputDirectory: shapefilesDirectory,
            // coordinates: this.data.coordinates.outer,
            coordinates: this.data._bounds.outer,
            tasksEnabled: this.data.tasksEnabled
          }),
        ] : []
      ] : [],

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
    ];

    const taskPipeline = [
      new CreateDirectoryTask({
        directory: this.courseDirectory
      }),

      ...this.data.tasksEnabled.terrain ? terrainDataTasks : [],

      // if we have overlays
      // ...Object.keys(this.data.tasksEnabled.overlays).some(key => this.data.tasksEnabled[key]) ? [
      new CreateDirectoryTask({
        directory: overlaysDirectory
      }),
      // ] : [],

      ...this.data.tasksEnabled.terrain && this.data.tasksEnabled.overlays.hillshade ? [
        new GenerateHillShadeImageTask({
          outputDirectory: overlaysDirectory
        }),
      ] : [],

      ...(this.data.tasksEnabled.overlays.google || this.data.tasksEnabled.overlays.bing) ? [
        new GenerateSatelliteImageryTask({
          prefix: 'inner',
          outputDirectory: overlaysDirectory,
          // coordinates: this.data.coordinates.inner,
          coordinates: this.data._bounds.inner,
          tasksEnabled: this.data.tasksEnabled
        }),
      ] : [],

      ...isOuterEnabled ? [

        ...this.data.tasksEnabled.terrain ? [
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
        ] : [],

        ...(this.data.tasksEnabled.overlays.google || this.data.tasksEnabled.overlays.bing) ? [
          new GenerateSatelliteImageryTask({
            prefix: 'outer',
            outputDirectory: overlaysDirectory,
            // coordinates: this.data.coordinates.outer,
            coordinates: this.data._bounds.outer,
            tasksEnabled: this.data.tasksEnabled
          }),
        ] : [],


      ] : [],



      new CreateCSVTask({
        outputDirectory: this.courseDirectory
      }),


      new CreateSVGTask({
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

      const label = task.label || `Running the task ${task.id}`;

      log.info(`[${task.id}] ${label}`);

      this.updateProgress({ id: task.id, label });
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
        // log the full job data
        log.error(`---------------\nJob Data:\n${JSON.stringify(this.data, null, 1)}`);

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