import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

import downloadDataSources from './steps/download.js';
import generateCSV from './steps/csv.js';
import { mergeLaz, lazToTiff } from './steps/pdal.js';
import {
  fillNoData,
  getGeoTiffStats,
  geoTIFFHillShade,
  generateSatelliteForSource,
  geoTiffToRaw
} from '../lib/steps/gdal.js';
import mkdirSafe from '../utils/mkdirSafe.js';

const SATELLITE_SOURCES = [
  'google',
  // 'bing'
];
// const innerResolution = 1.0; // 50 cm
// const outerResolution = 1.0; // 1m

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
  constructor(data, outputDirectory) {
    super();
    this.id = randomUUID();
    this.data = data;
    this.assets = [];
    this.progress = { step: 'created', label: 'Waiting for job to start' };
    this.state = JobStates.Queued;
    // this.created = new Date();
    this.terrainDirectory = outputDirectory || process.env.TERRAIN_DIR;
  }

  update() {
    this.emit('update', {
      state: this.state,
      data: this.data,
      progress: this.progress,
      ...this.error && { error: this.error }
    });
  }

  async process() {
    // console.log(this.data);
    // return;
    // download all the terrain data files
    // const localFiles = await downloadBatchUrls();
    try {
      // safety check
      if (!this.terrainDirectory) {
        throw new Error('Missing Terrain directory. Was the TERRAIN_DIR environment variable set?');
      }
      if (!fs.existsSync(this.terrainDirectory)) {
        throw new Error(`Terrain directory does not exist: ${this.terrainDirectory}`);
      }
      this.state = JobStates.Running;
      // setup base course directory
      this.courseDirectory = path.join(this.terrainDirectory, this.data.course);
      if (fs.existsSync(this.courseDirectory) && process.env.TEST_JOB !== '1') {
        throw new Error('A course folder with this name already exists!');
      }
      console.log(`Creating new course directory: ${this.courseDirectory}`);
      mkdirSafe(this.courseDirectory);

      this.progress = { step: 'download', label: 'Downloading lidar data', percent: 0 };
      this.update();

      if (!this.data.dataSource?.format) {
        throw new Error('Missing valid data source format!');
      }


      
      this.progress = { step: 'download', label: 'Preparing to download lidar data' };
      this.update();

      // create download directory
      const rawDataDirectory = path.join(this.courseDirectory, 'Downloads');
      console.log(`rawDataDirectory: ${rawDataDirectory}`);
      mkdirSafe(rawDataDirectory);


      // download source data files
      const dataWithLocalFiles = await downloadDataSources({
        sources: this.data.dataSource.items,
        downloadDirectory: rawDataDirectory,
        onDownloadProgress: (percent) => {
          const percentString = percent ? ` - ${percent.toFixed(1)}%` : '';
          this.progress = { step: 'download', label: `Downloading ${this.data.dataSource.items.length} lidar files${percentString}`, percent: percent };
          this.update();
        }
      });

      let innerTiff;
      let innerStats;
      let outerTiff;
      let outerStats;

      
      if (this.data.dataSource?.format === 'LAZ') {
        
        // create download directory
        const lazDataDirectory = path.join(this.courseDirectory, 'LAS');
        mkdirSafe(lazDataDirectory);


        this.progress = { step: 'process', label: `Merging ${this.data.dataSource.items.length} lidar files` };
        this.update();
        // generates GeoTIFFs from the LAZ source files we downloaded in the previous step

        const cropCoordinates = this.data.coordinates.outer.length ? this.data.coordinates.outer : this.data.coordinates.inner;
        const mergedLaz = await mergeLaz(dataWithLocalFiles, cropCoordinates, lazDataDirectory);

        this.progress = { step: 'raw', label: 'Preparing GeoTIFFs...' };
        this.update();
  
        const tiffDirectory = path.join(this.courseDirectory, 'GeoTIFF');
        mkdirSafe(tiffDirectory);
        
        this.progress = { step: 'process', label: 'Converting lidar data to inner GeoTIFF', secondary: 'This step may take a while' };
        this.update();

        // convert LAZ files to TIFF
        const innerLaz = await this.laz(mergedLaz, 'inner', this.data.resolution.inner, tiffDirectory, this.data.coordinates.inner);
        innerStats = innerLaz.stats;
        innerTiff = innerLaz.geoTiff;

        // creating the outer heightmap is optional
        if (this.data.coordinates.outer.length) {
          this.progress = { step: 'process', label: 'Converting lidar data to outer GeoTIFF', secondary: 'This step may take a while' };
          this.update();
  
          // convert LAZ files to TIFF
          const outerLaz = await this.laz(mergedLaz, 'outer', this.data.resolution.outer, tiffDirectory); // this.data.coordinates.outer
          outerStats = outerLaz.stats;
          outerTiff = outerLaz.geoTiff;
        }

      } else if (this.data.dataSource?.format === 'GeoTIFF' && this.data.dataSource.items.length > 1) {
        // TODO: merge multiple source TIFFs using GDAL?
      }



      if (!innerTiff || !innerStats) {
        throw new Error('Unable to generate inner TIFF');
      }
      this.progress = { step: 'raw', label: `Generating inner to height map (1 of ${outerTiff ? 2 : 1})` };
      this.update();

      // create inner raw terrain
      await geoTiffToRaw(innerTiff, innerStats);

      if (outerTiff && outerStats) {
        this.progress = { step: 'raw', label: `Generating outer height map (2 of 2)` };
        this.update();
          // create outer raw terrain
        await geoTiffToRaw(outerTiff, outerStats);
      }

      this.progress = { step: 'raw', label: 'Preparing overlays...' };
      this.update();

      // create overlays directory
      const overlaysDirectory = path.join(this.courseDirectory, 'Overlays');
      console.log(`overlaysDirectory: ${overlaysDirectory}`);
      mkdirSafe(overlaysDirectory);

      // generate satellite images
      const boundTypes = ['inner', outerTiff && 'outer'].filter(Boolean); // TODO: make outer optional
      const totalSteps = SATELLITE_SOURCES.length * boundTypes.length;

      this.progress = { step: 'satellite', label: `Generating satellite images (1 of ${totalSteps}, 0%)`, percent: 0 };
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
      console.log(error);
      this.error = error;
      this.state = JobStates.Error;
      this.update();
    }
  }

  async laz(mergedPointCloud, filenamePrefix, resolution, outputDirectory, coordinates) {
    // this.data.coordinates
    // generate merged GeoTIFF from laz file(s)
    console.log('[inner] Converting merged laz into a single high-res inner geoTIFF');
    const tiff = await lazToTiff(mergedPointCloud, filenamePrefix, resolution, outputDirectory, coordinates);
    // const innerGeoTiff = await mergeLaz(this.data.course, filenamePrefix, coordinates, dataWithLocalFiles, resolution, outputDirectory);
    // fill missing raster data in GeoTIFF
    console.log('[inner] Interpolating missing terrain data from merged geoTIFF');
    const filledGeoTiff = await fillNoData(tiff, filenamePrefix, resolution, outputDirectory);
    // TODO: remove original merged geotiff
    // await fs.promises.unlink(innerGeoTiff);
    const stats = await getGeoTiffStats(filledGeoTiff);
    return {
      stats,
      geoTiff: filledGeoTiff
    }
  }
  
  async processOuter() {
    
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
    if (!!this.activeJob) {
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

// export function create(data) {
//   const job = {
//     id: randomUUID(),
//     submitted: Date.now(),
//     state: JobStates.Queued,
//     data
//   };
//   jobQueue.set(job.id, job);

//   runNextInQueue();
// }

// function runNextInQueue() {
//   if (isRunning) {
//     return;
//   }
//   const queuedJobs = jobQueue
//     .values()
//     .filter(job => job.state === JobStates.Queued)
//     // order by submitted time
//     .sort((a, b) => a.submitted < b.submitted ? -1 : 1)
//   const [nextJob] = queuedJobs;
//   if (nextJob) {
//     isRunning = true;
//     runJob(nextJob)
//   }
// }

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
// function runJob(job) {
//   console.log('running job!', nextJob);
//   // await batchDownload();
//   await sleep(2000);
//   isRunning = false;
//   // runNextInQueue();
// }