import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { spawn, exec } from 'node:child_process';
import { app } from 'electron';
import log from 'electron-log';
import isDev from 'electron-is-dev';

import { GDAL_BINARIES, SatelliteSources } from '../constants.js';
import { tools } from '../tools/index.js';
import BaseTask from './base.js';
import { reprojectBounds, WGS84 } from '../utils/geo.js';

const execAsync = promisify(exec);

const WmsDirectory = isDev ? path.resolve(process.cwd(), './wms') : path.resolve(app.getAppPath(), '../wms');


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
    coordinates,
    prefix,
    resolution,
    outputDirectory
  }) {
    super();
    this.label = `Interpolating missing elevation data in ${prefix} TIFF file`;
    this.id = 'fill-nodata';
    this.coordinates = coordinates;
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
    const destFile2 = path.join(this.outputDirectory, `${this.prefix}_terrain_${Math.round(this.resolution * 100)}cm_crop.tif`);

    const onProgress = (percent) => {
      this.emit('progress', 'Interpolating missing data in GeoTIFF', percent);
    }
    const args = [
      // TODO: base this on resolution?
      // minimum pixel distance to look for missing data
      // set a high-ish value to try and avoid missing data
      '-md', '200',
      '-si', '2',
      // '-interp', 'nearest',
      inputFile, destFile
    ];
    await runGDALCommand(GDAL_BINARIES.gdal_fillnodata, args, { signal: this.abortController.signal, onProgress });

    // // crop the filled raster back to the original bounds
    // const nativeBounds = reprojectBounds(WGS84, data._inputCRS.proj4, ...this.coordinates);
    // const [xMin, yMin] = nativeBounds[0];
    // const [xMax, yMax] = nativeBounds[2];
    // const te = [xMin, yMin, xMax, yMax];
    // const cropWKT = `POLYGON ((${nativeBounds.map(coord => coord.join(' ')).join(', ')}))`;

    // console.log(`TE command: ${te}`);
    // await runGDALCommand(GDAL_BINARIES.gdalwarp, [
    //   '-cutline', cropWKT,
    //   '-crop_to_cutline',
    //   // '-ts', '8192', '8192',
    //   '-te', ...te,
    //   destFile, destFile2
    // ], { signal: this.abortController.signal, onProgress });

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

    this.outputDirectory = outputDirectory;
    this.coordinates = coordinates;
    this.tasksEnabled = tasksEnabled;
    this.activeSources = Object.values(SatelliteSources).filter(source => this.tasksEnabled.overlays[source]);
    this.label = `Downloading ${this.prefix} satellite imagery`;
    // sometimes sat jobs fail due to network errors,
    // we don't want to bail on the whole pipeline in those cases, just warn the user that we failed
    this.warnOnError = true;
  }

  async process(data) {
    if (!data._outputFiles[this.prefix].satellite) {
      data._outputFiles[this.prefix].satellite = {};
    }


    // const activeSources = SatelliteSources.filter(source => this.tasksEnabled[source]);

    for (const [index, source] of this.activeSources.entries()) {
      // const percent = (index / activeSources.length) * 100;
      this.emit('progress', `Downloading ${this.prefix} satellite imagery from ${source}`);

      const destFileStandard = path.join(this.outputDirectory, `${this.prefix}_sat_${source}.tif`);
      const destFileJPEG = path.join(this.outputDirectory, `${this.prefix}_sat_${source}.jpg`);
      const wmsSource = path.join(WmsDirectory, `${source}.xml`);

      if (!fs.existsSync(wmsSource)) {
        throw new Error(`Unable to generate ${source} satellite images. Missing WMS XML file.`);
      }
      try {

        const cropWKT = `POLYGON ((${this.coordinates.map(coord => coord.join(' ')).join(', ')}))`;

        await runGDALCommand(GDAL_BINARIES.gdalwarp, [
          '-t_srs', data._inputSRS,
          '-cutline', cropWKT,
          '-crop_to_cutline',
          '-ts', '8192', '8192',
          wmsSource,
          destFileStandard
        ], {
          signal: this.abortController.signal,
          env: {
            // GDAL_ENABLE_WMS_CACHE: 'WMS',
            GDAL_HTTP_RETRY_CODES: 'ALL',
            GDAL_DEFAULT_WMS_CACHE_PATH: app.getPath('temp'),
            GDAL_HTTP_MAX_RETRY: 10,
            GDAL_HTTP_RETRY_DELAY: 2,
            GDAL_HTTP_SSL_VERIFYSTATUS: 'NO'
          }
        });

        // convert to jpeg
        await runGDALCommand(GDAL_BINARIES.gdal_translate, [
          '-of', 'JPEG',
          '-r', 'cubic',
          '-co', 'QUALITY=95',
          '-outsize', '8192', '8192',
          destFileStandard,
          destFileJPEG
        ]);
      } catch (error) {
        log.error(error);
        throw new Error(`Failed downloading satellite images for ${this.prefix}:${source}`);
      }

      data._outputFiles[this.prefix].satellite[source] = destFileJPEG;
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
    const destFile = path.join(this.outputDirectory, 'hillshade_raw.tif');
    const destFile2 = path.join(this.outputDirectory, 'hillshade_8192x8192.jpg');

    await runGDALCommand(GDAL_BINARIES.gdaldem, [
      'hillshade',
      // '-compute_edges',
      // '-outsize', '8192', '8192',
      sourceFile,
      destFile
    ], { signal: this.abortController.signal });

    await runGDALCommand(GDAL_BINARIES.gdal_translate, [
      '-outsize', '8192', '8192',
      '-r', 'cubic',
      '-co', 'QUALITY=95',
      destFile,
      destFile2
    ]);

    data._outputFiles.hillshade = destFile2;
  }
}

export class GenerateShapefilesTask extends BaseTask {
  constructor({ prefix, outputDirectory, coordinates, tasksEnabled }) {
    super();
    this.prefix = prefix;
    this.outputDirectory = outputDirectory;
    this.coordinates = coordinates;
    this.tasksEnabled = tasksEnabled;
  }
  async process(data) {
    if (!this.tasksEnabled.shapefiles[this.prefix]) {
      log.info(`Skipping shapefile task for ${this.prefix}`);
      return;
    }

    const outputFile = path.join(this.outputDirectory, `${this.prefix}.shp`);
    const geoJSONFile = path.join(this.outputDirectory, `${this.prefix}.geojson`);

    const geoJSON = {
      type: 'Feature',
      id: this.prefix,
      properties: {},
      crs: {
        type: 'name',
        properties: {
          name: data._inputSRS
        }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [this.coordinates]
      }
    };
    await fs.promises.writeFile(geoJSONFile, JSON.stringify(geoJSON));

    await runGDALCommand(GDAL_BINARIES.ogr2ogr, [
      '-t_srs', data._inputSRS,
      '-f', 'ESRI Shapefile', outputFile, geoJSONFile
    ]);

    data._outputFiles[this.prefix].shapefile = outputFile;
    data._outputFiles[this.prefix].geojson = geoJSONFile;
  }
}