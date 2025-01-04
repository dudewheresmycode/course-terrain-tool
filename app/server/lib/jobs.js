import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import log from 'electron-log';

import downloadDataSources from './steps/download.js';
import generateCSV from './steps/csv.js';
import { mergeLaz, lazToTiff } from './steps/pdal.js';
import {
  fillNoData,
  getGeoTiffStats,
  geoTIFFHillShade,
  generateSatelliteForSource,
  geoTiffToRaw
} from './steps/gdal.js';
import mkdirSafe from '../../utils/mkdirSafe.js';
import { tools } from '../../tools/index.js';

const SATELLITE_SOURCES = [
  'google',
  // 'bing'
];

const JobStates = {
  Queued: 'queued',
  Running: 'running',
  Canceled: 'canceled',
  Error: 'error',
  Finished: 'finished'
}

// TODO: move to redis?

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export class Job extends EventEmitter {
  constructor(data, outputFolder) {
    super();
    this.id = randomUUID();
    this.data = data;
    this.assets = [];
    this.progress = { step: 'created', label: 'Waiting for job to start' };
    this.state = JobStates.Queued;

    if (outputFolder) {
      this.data.outputFolder = outputFolder;
    }
    // this.created = new Date();
    // this.terrainDirectory = outputDirectory || process.env.TERRAIN_DIR
  }

  update() {
    this.emit('update', {
      state: this.state,
      data: this.data,
      progress: this.progress,
      ...this.error && { error: this.error }
    });
  }

  updateProgress({ step, label, percent }) {
    this.progress = { step, label, percent };
    this.update();
    log.info(`[${step}]${percent ? '[' + percent.toFixed(1) + '%]' : ''} ${label}`);
  }

  async process() {
    // console.log(this.data);
    // return;
    // download all the terrain data files
    // const localFiles = await downloadBatchUrls();
    try {
      // safety check
      if (!this.data.outputFolder) {
        throw new Error('Missing outputDirectory. Unable to continue');
      }
      this.courseDirectory = this.data.outputFolder;
      log.info(`Using course directory: ${this.courseDirectory}`);

      if (fs.existsSync(this.courseDirectory)) {
        throw new Error(`Course directory already exists! ${this.courseDirectory}`);
      }
      mkdirSafe(this.courseDirectory);

      this.state = JobStates.Running;
      // setup base course directory
      // if (fs.existsSync(this.courseDirectory) && process.env.TEST_JOB !== '1') {
      //   throw new Error('A course folder with this name already exists!');
      // }
      // console.log(`Creating new course directory: ${this.courseDirectory}`);
      // mkdirSafe(this.courseDirectory);

      this.updateProgress({ step: 'download', label: 'Downloading lidar data files' });

      if (!this.data.dataSource?.format) {
        throw new Error('Missing valid data source format!');
      }

      // create download directory
      const rawDataDirectory = path.join(this.courseDirectory, 'Downloads');
      log.debug(`Creating Downloads directory at ${rawDataDirectory}`);
      mkdirSafe(rawDataDirectory);


      // download source data files
      const dataWithLocalFiles = await downloadDataSources({
        sources: this.data.dataSource.items,
        downloadDirectory: rawDataDirectory,
        onDownloadProgress: (percent) => {
          const percentString = percent ? ` - ${percent.toFixed(1)}%` : '';
          this.updateProgress({
            step: 'download',
            label: `Downloading ${this.data.dataSource.items.length} lidar data files${percentString}`,
            percent
          });
        }
      });

      let innerTiff;
      let innerStats;
      let outerTiff;
      let outerStats;


      if (this.data.dataSource?.format === 'LAZ') {

        // create download directory
        const lazDataDirectory = path.join(this.courseDirectory, 'LAS');
        log.debug(`Creating LAS directory at ${lazDataDirectory}`);
        mkdirSafe(lazDataDirectory);

        this.updateProgress({
          step: 'process',
          label: `Merging ${this.data.dataSource.items.length} lidar files`
        });

        // generates GeoTIFFs from the LAZ source files we downloaded in the previous step
        const cropCoordinates = this.data.coordinates.outer.length ? this.data.coordinates.outer : this.data.coordinates.inner;
        const mergedLaz = await mergeLaz(dataWithLocalFiles, cropCoordinates, lazDataDirectory);

        this.updateProgress({ step: 'raw', label: 'Preparing GeoTIFFs...' });

        const tiffDirectory = path.join(this.courseDirectory, 'GeoTIFF');
        log.debug(`Creating GeoTIFF directory at ${tiffDirectory}`);
        mkdirSafe(tiffDirectory);

        this.updateProgress({
          step: 'process',
          label: 'Converting lidar data to inner GeoTIFF',
          secondary: 'This step could take a while'
        });

        // convert LAZ files to TIFF
        const innerLaz = await this.processLaz(mergedLaz, 'inner', this.data.resolution.inner, tiffDirectory, this.data.coordinates.inner);
        innerStats = innerLaz.stats;
        innerTiff = innerLaz.geoTiff;

        // creating the outer heightmap is optional
        if (this.data.coordinates.outer.length) {
          this.updateProgress({
            step: 'process',
            label: 'Converting lidar data to outer GeoTIFF',
            secondary: 'This step may take a while'
          });

          // convert LAZ files to TIFF
          const outerLaz = await this.processLaz(mergedLaz, 'outer', this.data.resolution.outer, tiffDirectory); // this.data.coordinates.outer
          outerStats = outerLaz.stats;
          outerTiff = outerLaz.geoTiff;
        }

      } else if (this.data.dataSource?.format === 'GeoTIFF' && this.data.dataSource.items.length > 1) {
        // TODO: merge multiple source TIFFs using GDAL?
      }



      if (!innerTiff || !innerStats) {
        throw new Error('Unable to generate inner TIFF');
      }
      this.updateProgress({ step: 'raw', label: `Generating inner height map (1 of ${outerTiff ? 2 : 1})` });

      // create inner raw terrain
      await geoTiffToRaw(innerTiff, innerStats);

      if (outerTiff && outerStats) {
        this.updateProgress({ step: 'raw', label: 'Generating outer height map (2 of 2)' });
        // create outer raw terrain
        await geoTiffToRaw(outerTiff, outerStats);
      }

      this.updateProgress({ step: 'raw', label: 'Preparing overlays...' });

      // create overlays directory
      const overlaysDirectory = path.join(this.courseDirectory, 'Overlays');
      log.debug(`Creating overlays directory: ${overlaysDirectory}`);
      mkdirSafe(overlaysDirectory);

      // generate satellite images
      const boundTypes = ['inner', outerTiff && 'outer'].filter(Boolean); // TODO: make outer optional
      const totalSteps = SATELLITE_SOURCES.length * boundTypes.length;

      this.updateProgress({ step: 'satellite', label: `Generating satellite images (1 of ${totalSteps}, 0%)`, percent: 0 });
      this.update();

      for (const [boundIndex, boundType] of boundTypes.entries()) {
        for (const [sourceIndex, source] of SATELLITE_SOURCES.entries()) {
          const currentStep = boundIndex + sourceIndex + 1;
          const percent = (currentStep / totalSteps) * 100;
          await generateSatelliteForSource(source, overlaysDirectory, boundType, this.data.coordinates[boundType]);
          this.progress = { step: 'satellite', label: `Generating satellite images - (${currentStep} of ${totalSteps}, ${percent.toFixed(1)}%)`, percent };
          this.update();
        }
      }

      // generate hillshade image for inner
      this.progress = { step: 'hillshade', label: 'Generating hillshade images' };
      this.update();
      const hillshade = await geoTIFFHillShade(innerTiff, overlaysDirectory);

      if (innerStats) {
        this.progress = { step: 'csv', label: 'Generating CSV file' };
        this.update();

        const csvFilePath = path.join(this.courseDirectory, 'MinMax.csv');
        await generateCSV(this.data, innerStats, outerStats, csvFilePath);
        this.assets.push(csvFilePath);
      }

      this.state = JobStates.Finished;
      this.progress = { step: 'finished', label: 'Finishing Up' };
      this.update();

    } catch (error) {
      log.error(error);
      this.error = error;
      this.state = JobStates.Error;
      this.update();
    }
  }

  async processLaz(mergedPointCloud, filenamePrefix, resolution, outputDirectory, coordinates) {
    // this.data.coordinates
    // generate merged GeoTIFF from laz file(s)
    log.info('Converting merged laz into a single high-res inner geoTIFF');
    const tiff = await lazToTiff(mergedPointCloud, filenamePrefix, resolution, outputDirectory, coordinates);
    // fill missing raster data in GeoTIFF
    log.info('Interpolating missing terrain data from merged geoTIFF');
    const filledGeoTiff = await fillNoData(tiff, filenamePrefix, resolution, outputDirectory);
    // TODO: remove original merged geotiff
    // await fs.promises.unlink(tiff);
    const stats = await getGeoTiffStats(filledGeoTiff);

    return {
      stats,
      geoTiff: filledGeoTiff
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

  async runJob() {
    if (!this.activeJob) {
      return;
    }
    //   // await batchDownload();
    await this.activeJob.process();
    // await sleep(5000);
    this.activeJob = undefined;
    //   isRunning = false;

  }
}