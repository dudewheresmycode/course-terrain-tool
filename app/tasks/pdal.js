import path from 'node:path';
import log from 'electron-log';
import { spawn } from 'node:child_process';
import proj4 from 'proj4';

import BaseTask from './base.js';
import { tools } from '../tools/index.js';
import { getProjInfo } from './gdal.js';

// the projection that our map and course/crop area uses
export const CommonProjection = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

export function runPDALCommand(command, args, abortController, stdinData) {

  const [bin, ...condaArgs] = tools.gdal.type === 'conda' ? [
    tools.conda,
    'run',
    // allows us to write to stdin
    '--no-capture-output',
    '-p', tools.condaEnv,
    'pdal'
  ] : [
    tools.pdal
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(bin, [
      ...condaArgs,
      command,
      ...args,
      // '--verbose=8',
      // `--progress=${fifo}`,
      ...stdinData ? ['--stdin'] : []
    ], {
      ...abortController?.signal ? {
        signal: abortController.signal,
      } : {},
      ...abortController?.timeout ? {
        timeout: abortController.timeout
      } : {}
    });
    child.stderr.on('data', data => {
      log.debug(`[pdal.stderr]: ${data}`);
    });
    let response = '';
    child.stdout.on('data', data => {
      response += data.toString();
    });
    if (stdinData) {
      child.stdin.write(JSON.stringify(stdinData));
      child.stdin.end();
    }

    child.on('error', error => {
      log.error('[pdal] process error:', error);
      return reject(error);
    });
    child.on('exit', code => {
      log.debug(`[pdal] exited with code: ${code}`);
      if (code !== 0) {
        reject();
      }
    });
    child.on('close', code => {
      log.debug(`[pdal] closed with code: ${code}`);
      if (code !== 0) {
        return reject(code);
      }
      try {
        resolve(JSON.parse(response));
      } catch (error) {
        resolve(response);
      }
    });
  });
}

function coordinatesToPolygon(coordinates) {
  if (!coordinates?.length) {
    return;
  }
  return `POLYGON ((${coordinates.map(coord => coord.join(' ')).join(', ')}))`;
}

function reprojectBounds(sourceProj4, minx, miny, maxx, maxy) {
  return [
    [minx, maxy],
    [maxx, maxy],
    [maxx, miny],
    [minx, miny],
    [minx, maxy],
  ].map(point => {
    return proj4(
      sourceProj4,
      CommonProjection,
      point
    );
  });
}

export async function getLAZInfo(item, abortController) {
  const inputUri = item._file || item.downloadURL;

  // we re-run this method when we set a new CRS
  // we skip the PDAL info command if we already grabbed the metadata once and just need to reproject the box
  if (item.crs?.source === 'user') {
    const proj4 = await getProjInfo(item.crs.id.authority, item.crs.id.code);

    item.crs.proj4 = proj4;
    const newBounds = reprojectBounds(proj4, ...item.bbox.coordinates);

    item.bbox.boundary = {
      'type': 'Feature',
      'geometry': {
        'type': 'Polygon',
        'coordinates': [newBounds]
      }
    };
    return item;
  }
  const response = await runPDALCommand('info', ['--metadata', inputUri], abortController);
  let unit = item.unit;
  let crs = item.crs;

  const projectedCRS = response?.metadata?.srs?.json?.components?.find(c => c.type === 'ProjectedCRS');
  if (projectedCRS) {
    crs = {
      name: projectedCRS.base_crs.name,
      id: projectedCRS.base_crs.id,
      source: 'laz',
      proj4: response.metadata.srs.proj4
    };
    unit = response?.metadata?.srs?.units;
  }

  const { minx, miny, maxx, maxy } = response.metadata;
  let bbox = [minx, miny, maxx, maxy];
  let polygon = [];

  if (response.metadata.srs.proj4) {
    log.debug(`Re-projecting bbox coordinates to ${CommonProjection}`, bbox);
    polygon = reprojectBounds(response.metadata.srs.proj4, minx, miny, maxx, maxy);
  }

  return {
    bbox: {
      coordinates: bbox,
      boundary: {
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          'coordinates': [polygon]
        }
      }
    },
    unit,
    crs
  };
}

export class RasterizeLAZTask extends BaseTask {
  constructor({
    prefix,
    resolution,
    outputDirectory,
    coordinates
  }) {
    super();
    this.id = 'pdal-raster';
    this.label = `Converting ${prefix} LAZ/LAS file to TIFF file`;
    this.prefix = prefix;
    this.resolution = resolution;
    this.outputDirectory = outputDirectory;
    this.coordinates = coordinates;
  }

  async process(data) {
    if (!data._outputFiles.las) {
      throw new Error('Error creating raster from LAS file');
    }
    const tiffOutputFile = path.join(this.outputDirectory, `${this.prefix}_laz_${Math.round(this.resolution * 100)}_temp.tif`);
    // crop area
    const pipeline = {
      pipeline: [
        // the merged las file
        data._outputFiles.las,
        ...this.coordinates ? [
          {
            type: 'filters.crop',
            a_srs: 'EPSG:4326',
            polygon: coordinatesToPolygon(this.coordinates)
          }
        ] : [],
        {
          filename: tiffOutputFile,
          gdaldriver: 'GTiff',
          // supported values are “min”, “max”, “mean”, “idw”, “count”, “stdev” and “all”.
          output_type: 'mean',
          // output_type: 'idw',
          // output_type: 'all',
          // fill missing data?
          // nodata: -9999,
          resolution: this.resolution,
          type: 'writers.gdal'
        }
      ].filter(Boolean)
    }

    await runPDALCommand('pipeline', [], this.abortController, pipeline);
    data._outputFiles[this.prefix].tiff = tiffOutputFile;
  }
}

export class MergeLAZTask extends BaseTask {
  constructor({ coordinates, outputDirectory }) {
    super();
    this.label = 'Merging and cropping downloaded LAZ files';
    this.coordinates = coordinates;
    this.outputDirectory = outputDirectory;
  }

  async process(data) {
    if (!data._outputFiles.downloads?.length) {
      throw new Error('No downloaded files to process');
    }
    const localFiles = data._outputFiles.downloads.map(item => item._file).filter(Boolean);
    if (!localFiles.length) {
      throw new Error('No local point cloud files found!');
    }
    const lazOutputFile = path.join(this.outputDirectory, 'merged_laz_outer.las');

    // crop area
    const cropWKT = `POLYGON ((${this.coordinates.map(coord => coord.join(' ')).join(', ')}))`;

    const pipeline = {
      pipeline: [
        ...data._outputFiles.downloads.map(item => {
          const inputSRS = `${item.crs.id.authority}:${item.crs.id.code}`;
          return {
            type: 'readers.las',
            filename: item._file,
            // force the user set CRS
            ...item.crs.source === 'user' ? { override_srs: inputSRS } : {}
          }
        }),
        // TODO: move the filtering to a separate step
        // this way we use the cropped/merged LAS file to generate vegetation masks
        // and heat-maps using data we're currently filtering out

        // QUESTION: do we want to apply the SMRF filter to all files? or just ones with no classification data?
        // https://pdal.io/en/2.4.3/workshop/exercises/analysis/ground/ground.html
        {
          type: 'filters.smrf',
          where: '(Classification == 0)'
        },
        {
          type: 'filters.range',
          // Classification 2 = Ground
          // Classification 9 = Water
          // Classification 6 = Building
          // Classification 10 = Rail
          // Classification 11 = Road
          // Source: https://desktop.arcgis.com/en/arcmap/latest/manage-data/las-dataset/lidar-point-classification.htm
          limits: [
            // 'Classification[1:1]', // Unclassified
            'Classification[1.1:2.1]', // Ground
            'Classification[8.1:9.1]', // Water
            'Classification[10.1:11.1]', // Road
            'Classification[16.1:17.1]' // Bridges
          ].join(',') //Z[1.1:2.1],
          // where: '(Classification != 0)'
        },
        {
          type: 'filters.crop',
          a_srs: 'EPSG:4326',
          polygon: cropWKT
        },
        // merge into single las file
        {
          type: 'writers.las',
          // compression: true,
          filename: lazOutputFile
        }
      ]
    };

    await runPDALCommand('pipeline', [], this.abortController, pipeline);

    data._outputFiles.las = lazOutputFile;
    // return lazOutputFile;
  }

}
