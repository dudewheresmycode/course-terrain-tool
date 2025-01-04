import log from 'electron-log';
import path from 'path';
import { promisify } from 'util';
import { spawn, exec, execSync } from 'child_process';
import os from 'os';
import { tools } from '../../../tools/index.js';

import mkdirSafe from '../../../utils/mkdirSafe.js';

const execAsync = promisify(exec);

function runPipelineCommand(pipelineData) {

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
    ]);
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


/**
 * Merges multiple LAZ/LAS files into a single cropped LAZ
 */
export async function mergeLaz(items, coordinates, outputDirectory) {

  const localFiles = items.map(item => item._file);
  if (!localFiles.length) {
    throw new Error('No local point cloud files found!');
  }
  const lazOutputFile = path.join(outputDirectory, 'merged_laz_outer.las');

  // crop area
  const cropWKT = `POLYGON ((${coordinates.map(coord => coord.join(' ')).join(', ')}))`;

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
          'Classification[1:1]', // Unclassified
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

  await runPipelineCommand(pipeline);

  return lazOutputFile;
}

export async function getLAZInfo(inputFile) {
  const res = await execAsync(`pdal info "${inputFile}"`);
  const data = JSON.parse(res.stdout);
  return data;
}
function coordinatesToPolygon(coordinates) {
  if (!coordinates?.length) {
    return;
  }
  return `POLYGON ((${coordinates.map(coord => coord.join(' ')).join(', ')}))`;
}

export async function lazToTiff(mergedLaz, filenamePrefix, resolution, outputDirectory, coordinates) {
  const tiffOutputFile = path.join(outputDirectory, `${filenamePrefix}_laz_${Math.round(resolution * 100)}_temp.tif`);
  // crop area
  const pipeline = {
    pipeline: [
      mergedLaz,
      coordinates && {
        type: 'filters.crop',
        a_srs: 'EPSG:4326',
        polygon: coordinatesToPolygon(coordinates)
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
        resolution,
        type: 'writers.gdal'
      }
    ].filter(Boolean)
  }
  await runPipelineCommand(pipeline);
  return tiffOutputFile;
}