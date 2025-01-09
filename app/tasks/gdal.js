import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { spawn, exec } from 'node:child_process';
import { app } from 'electron';
import log from 'electron-log';
import isDev from 'electron-is-dev';

import { GDAL_BINARIES } from '../constants.js';
import { tools } from '../tools/index.js';
import BaseTask from './base.js';

const execAsync = promisify(exec);

const WmsDirectory = isDev ? path.resolve(process.cwd(), './wms') : path.resolve(app.getAppPath(), '../wms');

const SatelliteSources = [
  'google',
  'bing'
];

function getGDALCommand(binaryName) {
  const gdalbin = tools.gdal.bin[binaryName];
  if (!gdalbin) {
    throw new Error(`Unable to locate the GDAL command ${gdalbin}`);
  }
  return tools.gdal.type === 'conda' ? [
    tools.conda,
    'run',
    '-p', tools.condaEnv,
    gdalbin
  ] : [gdalbin];
}

export function runGDALCommand(binName, args, options = {}) {
  const { signal, onProgress, env } = options;
  let progress = 0;
  return new Promise((resolve, reject) => {
    const [bin, ...extraArgs] = getGDALCommand(binName);
    if (!bin) {
      throw new Error('Unable to find tool location');
    }
    const child = spawn(bin, [
      ...extraArgs,
      ...args
    ], { signal, env });
    child.stderr.on('data', (data) => {
      log.info(`[${binName}]: ${data}`);
    });
    let output = '';
    child.stdout.on('data', (data) => {
      if (typeof onProgress === 'function') {
        const log = data.toString().trim();
        const int = parseInt(log, 10);
        if (data.toString().trim() === '.') {
          progress += 2;
        } else if (int) {
          progress = int;
        }
        onProgress(progress);
      } else {
        output += data.toString();
      }
    });
    child.on('close', (exitCode) => {
      log.debug(`exited with code : ${exitCode}`);
      if (exitCode !== 0) {
        return reject(`Error running ${binName} command`);
      }
      resolve(output.trim());
    });
  });
}

export function getProjInfo(authority, code) {
  return runGDALCommand(GDAL_BINARIES.projinfo, [[authority, code].join(':'), '-o', 'PROJ', '-q']);
}

export class GeoTiffStatsTask extends BaseTask {
  constructor({ prefix }) {
    super();
    this.label = `Gathering statistics about the ${prefix} TIFF file`;
    this.id = 'stats';
    this.prefix = prefix;
  }

  async process(data) {
    const cmd = getGDALCommand(GDAL_BINARIES.gdalinfo);
    const inputFile = data._outputFiles[this.prefix]?.tiff;
    if (!inputFile) {
      throw new Error('Could not locate input tiff from previous pipeline step');
    }
    const res = await execAsync(`${cmd.join(' ')} -mm -json "${inputFile}"`, { signal: this.abortController.signal });
    const stats = JSON.parse(res.stdout);
    const [band] = stats.bands;
    if (!band) {
      throw new Error('No band found in TIFF file');
    }
    const min = band.computedMin;
    const max = band.computedMax;
    const unit = band.unit?.includes('feet') ? 'feet' : 'meters';

    if (!data._stats) {
      data._stats = {};
    }
    data._stats[this.prefix] = {
      min,
      max,
      unit
    };
  }

}

/**
 * Fills the missing information in the GeoTIFF by interpolating nearby pixels
 */
export class GeoTiffFillNoDataTask extends BaseTask {
  constructor({
    prefix, resolution, outputDirectory
  }) {
    super();
    this.label = `Interpolating missing elevation data in ${prefix} TIFF file`;
    this.id = 'fill-nodata';
    this.prefix = prefix;
    this.resolution = resolution;
    this.outputDirectory = outputDirectory;
  }

  async process(data) {
    const inputFile = data._outputFiles[this.prefix]?.tiff;
    if (!inputFile) {
      throw new Error('Could not locate input tiff from previous pipeline step');
    }
    const destFile = path.join(this.outputDirectory, `${this.prefix}_terrain_${Math.round(this.resolution * 100)}cm.tif`);

    const onProgress = (percent) => {
      this.emit('progress', 'Interpolating missing data in GeoTIFF', percent);
    }
    const args = [
      // '-md', '40',
      // '-si', '1',
      // '-interp', 'nearest',
      inputFile, destFile
    ];
    await runGDALCommand(GDAL_BINARIES.gdal_fillnodata, args, { signal: this.abortController.signal, onProgress });

    // remove the previous temporary tiff?
    // await fs.promises.unlink(data._outputFiles[this.prefix].tiff);
    data._outputFiles[this.prefix].tiff = destFile;

  }
}

export class GeoTiffToRaw extends BaseTask {
  constructor({ prefix, outputDirectory }) {
    super();
    this.prefix = prefix;
    this.outputDirectory = outputDirectory;
    this.id = 'tiff2raw';
    this.label = `Converting ${prefix} TIFF file to RAW terrain height map`;
  }

  async process(data) {
    const stats = data._stats[this.prefix];
    if (typeof stats.min !== 'number' || typeof stats.max !== 'number') {
      throw new Error('Missing stats from previous pipeline command');
    }
    const inputFile = data._outputFiles[this.prefix]?.tiff;
    if (!inputFile) {
      throw new Error('Missing TIFF file from previous pipeline command');
    }
    const { name: filename } = path.parse(inputFile);
    const destFile = path.join(this.outputDirectory, `${filename}.raw`);
    // gdal_translate –ot UInt16 –scale –of ENVI –outsize 1025 1025 srtm_36_02_warped_cropped.tif heightmap.raw
    await runGDALCommand(GDAL_BINARIES.gdal_translate, [
      '-of', 'ENVI', '-ot', 'UInt16',
      '-scale', stats.min, stats.max, '0', '65535',
      '-outsize', '4097', '4097',
      '-r', 'bilinear',
      inputFile,
      destFile
    ], { signal: this.abortController.signal });

    data._outputFiles[this.prefix].raw = destFile;
  }
}

export class GenerateSatelliteImageryTask extends BaseTask {
  constructor({ prefix, outputDirectory, coordinates, tasksEnabled }) {
    super();
    this.id = 'satellite';
    this.prefix = prefix;
    this.label = `Initializing ${this.prefix} satellite imagery task`;
    this.outputDirectory = outputDirectory;
    this.coordinates = coordinates;
    this.tasksEnabled = tasksEnabled;
  }

  async process(data) {
    if (!data._outputFiles[this.prefix].satellite) {
      data._outputFiles[this.prefix].satellite = {};
    }


    const activeSources = SatelliteSources.filter(source => this.tasksEnabled[source]);

    for (const source of activeSources) {
      this.label = `Grabbing ${this.prefix} satellite imagery from ${source}`;

      const destFile = path.join(this.outputDirectory, `${this.prefix}_sat_${source}.jpg`);
      const wmsSource = path.join(WmsDirectory, `${source}.xml`);

      if (!fs.existsSync(wmsSource)) {
        throw new Error(`Unable to generate ${source} satellite images. Missing WMS XML file.`);
      }
      const [xMin, yMin] = this.coordinates[0];
      const [xMax, yMax] = this.coordinates[2];

      await runGDALCommand(GDAL_BINARIES.gdal_translate, [
        '-projwin', ...[xMin, yMin, xMax, yMax],
        '-projwin_srs', 'EPSG:4326',

        // jpeg settings
        '-of', 'JPEG',
        '-r', 'cubic',
        '-co', 'QUALITY=95',

        // override output projection to match our input lidar data
        '-a_srs', data._inputSRS,
        // Question: Do we want the higher quality GeoTiff output?
        // '-of', 'GTiff',
        '-outsize', '8192', '8192',
        wmsSource,
        destFile
      ], {
        signal: this.abortController.signal,
        env: {
          GDAL_DEFAULT_WMS_CACHE_PATH: app.getPath('temp'),
          GDAL_HTTP_MAX_RETRY: 3,
          GDAL_HTTP_RETRY_DELAY: 2,
          GDAL_HTTP_SSL_VERIFYSTATUS: 'NO'
        }
      });

      data._outputFiles[this.prefix].satellite[source] = destFile;
    }

  }
}

export class GenerateHillShadeImageTask extends BaseTask {
  constructor({ outputDirectory }) {
    super();
    this.label = 'Generating inner hill shade image';
    this.outputDirectory = outputDirectory;
  }

  async process(data) {
    const sourceFile = data._outputFiles.inner.tiff;
    if (!sourceFile) {
      throw new Error('Missing TIFF generated in previous pipeline step');
    }
    const destFile = path.join(this.outputDirectory, 'hillshade.jpg');
    await runGDALCommand(GDAL_BINARIES.gdaldem, [
      'hillshade',
      '-compute_edges',
      sourceFile,
      destFile
    ], { signal: this.abortController.signal });
    data._outputFiles.hillshade = destFile;
  }
}