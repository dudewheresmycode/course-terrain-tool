import path from 'node:path';
import log from 'electron-log';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

import BaseTask from './base.js';
import { tools } from '../tools/index.js';


function runPipelineCommand(pipelineData, abortController) {

  const [bin, ...args] = tools.gdal.type === 'conda' ? [
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
      ...args,
      'pipeline',
      // '--verbose=8',
      // `--progress=${fifo}`,
      '--stdin'
    ], { signal: abortController.signal });
    child.stderr.on('data', data => {
      log.debug(`[pdal.stderr]: ${data}`);
    });
    child.stdout.on('data', data => {
      log.debug(`[pdal.stdout]: ${data}`);
    });
    child.stdin.write(JSON.stringify(pipelineData));
    child.stdin.end();

    child.on('close', code => {
      log.debug(`[pdal] exited with code: ${code}`);
      if (code !== 0) {
        return reject();
      }
      resolve();
    });
  });
}

function coordinatesToPolygon(coordinates) {
  if (!coordinates?.length) {
    return;
  }
  return `POLYGON ((${coordinates.map(coord => coord.join(' ')).join(', ')}))`;
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
    // this.mergedLaz = mergedLaz;
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
        data._outputFiles.las,
        this.coordinates && {
          type: 'filters.crop',
          a_srs: 'EPSG:4326',
          polygon: coordinatesToPolygon(this.coordinates)
        },
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
    await runPipelineCommand(pipeline, this.abortController);

    data._outputFiles[this.prefix].tiff = tiffOutputFile;
    // return tiffOutputFile;
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

    // const fifo = await makefifo();

    const pipeline = {
      pipeline: [
        ...localFiles,
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

    await runPipelineCommand(pipeline, this.abortController);

    data._outputFiles.las = lazOutputFile;
    // return lazOutputFile;
  }

}
