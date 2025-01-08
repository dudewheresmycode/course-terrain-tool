import path from 'node:path';
import log from 'electron-log';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
// import wktcrs from 'wkt-crs';
import wellknown from 'wellknown';
import proj4 from 'proj4';
import reprojectBoundingBox from 'reproject-bbox';

// import { create as createXML } from 'xmlbuilder2';

import BaseTask from './base.js';
import { tools } from '../tools/index.js';
import { getProjInfo } from './gdal.js';

// the projection that our map and course/crop area uses
export const CommonProjection = '+proj=longlat +datum=WGS84 +no_defs +type=crs';
// const CommonProjection = '+proj=longlat +lat_0=90 +lon_0=0 +x_0=6300000 +y_0=6300000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs';


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
      // log.debug(`[pdal.stdout]: ${data}`);
      response += data.toString();
    });
    if (stdinData) {
      child.stdin.write(JSON.stringify(stdinData));
      child.stdin.end();
    }

    child.on('error', error => {
      log.error('[pdal] process error:', error);
      // child.kill(abortController.signal);
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
  // so skip the PDAL info command if we already grabbed the metadata once
  // and just need to reproject the box
  // console.log('get info', item.crs);
  // reproject the user polygon from the user input
  if (item.crs?.source === 'user') {
    console.log('GET POLYGON FOR USER SET CRS');
    console.log(item.crs);
    const proj4 = await getProjInfo(item.crs.id.authority, item.crs.id.code);
    console.log('proj4', proj4);
    item.crs.proj4 = proj4;
    const newBounds = reprojectBounds(proj4, ...item.bbox.coordinates);
    // console.log('new boundary', newBounds);
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

  // console.log('metadata', response);
  // const bbox = response?.stats?.bbox?.['EPSG:4326'];


  // wellknown  
  // const boundaryWKT = response?.summary?.bounds;
  let boundaryJSON;
  // if (boundaryWKT) {
  //   boundaryJSON = wellknown(boundaryWKT);
  // }

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
    // [item.boundingBox?.minX, item.boundingBox?.maxY],
    // [item.boundingBox?.maxX, item.boundingBox?.maxY],
    // [item.boundingBox?.maxX, item.boundingBox?.minY],
    // [item.boundingBox?.minX, item.boundingBox?.minY],
    polygon = reprojectBounds(response.metadata.srs.proj4, minx, miny, maxx, maxy);
    // convert between CRS types
    // polygon = [
    //   proj4(
    //     response.metadata.srs.proj4,
    //     CommonProjection,
    //     [minx, miny]
    //   ),
    //   proj4(
    //     response.metadata.srs.proj4,
    //     CommonProjection,
    //     [maxx, maxy]
    //   ),
    //   proj4(
    //     response.metadata.srs.proj4,
    //     CommonProjection,
    //     [maxx, miny]
    //   ),
    //   proj4(
    //     response.metadata.srs.proj4,
    //     CommonProjection,
    //     [minx, miny]
    //   ),
    // ];
    console.log(polygon);
    // bbox = [min, max];
    // bbox = reprojectBoundingBox({
    //   bbox,
    //   // spatial reference system of input bounding box
    //   from: projectedCRS.base_crs.id.code,
    //   // convert bounding box to this spatial reference system
    //   to: 4326
    // });
  }

  console.log('boundaryJSON', bbox);
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
      // boundary: {
      //   type: 'Polygon',
      //   coordinates: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
      // }
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
    // return tiffOutputFile;
  }
}

// export class GetLAZInfoTask extends BaseTask {
//   constructor() {
//     super();
//     this.label = 'Gathering information about the point cloud data';
//     this.exitOnComplete = true;
//   }

//   async process(data) {
//     const localFiles = data._outputFiles.imported || data._outputFiles.downloads.map(item => item._file).filter(Boolean);
//     if (!localFiles.length) {
//       throw new Error('No local point cloud files found!');
//     }

//     const lazMetadata = [];
//     for (const filePath of localFiles) {
//       const response = await runPDALCommand('info', ['--metadata', filePath], this.abortController);
//       const metadata = parseInfoFromMetadata(response);
//       lazMetadata.push(metadata);
//     }
//     data._lazMetadata = lazMetadata;

//   }
// }

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

    console.log('localFiles', localFiles);
    // crop area
    const cropWKT = `POLYGON ((${this.coordinates.map(coord => coord.join(' ')).join(', ')}))`;

    const pipeline = {
      pipeline: [
        // ...localFiles,
        ...data._outputFiles.downloads.map(item => {
          const inputSRS = `${item.crs.id.authority}:${item.crs.id.code}`;
          console.log(`inputSRS: ${inputSRS}`);
          console.log(`file: ${item._file}`);
          return {
            type: 'readers.las',
            filename: item._file,
            // QUESTION: Should we use "override_srs" here to force the CRS to the value set in the app?
            // I figured if the LAS file contains the projection it's probably the correct one. So I chose default_srs
            // to make it more dummy-proof. If we really want to be able to force
            // override_srs
            // override_srs: inputSRS
            default_srs: inputSRS
          }
        }),
        // QUESTION: do we want to apply this to all files? or just ones with no classifcation data?
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
        // {
        //   type: 'filters.reprojection',
        //   // in_srs: 'EPSG:26916',
        //   out_srs: 'EPSG:4326'
        // },
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
