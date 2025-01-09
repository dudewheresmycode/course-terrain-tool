import path from 'node:path';
import log from 'electron-log';
import { spawn } from 'node:child_process';
import proj4 from 'proj4';
import { create as xmlToObject } from 'xmlbuilder2';

import BaseTask from './base.js';
import { tools } from '../tools/index.js';
import { OGSApiEndpoint } from '../constants.js';
import { getProjInfo } from './gdal.js';
import crsList from '../crs-list.json' with { type: 'json' };

// the projection that our map and course/crop area uses
export const Common = '+proj=longlat +datum=WGS84 +no_defs +type=crs';
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

async function scrapeCRSFromXML(item) {
  if (!item.metaUrl) {
    return;
  }
  const metadataURL = `${item.metaUrl}?format=json`;
  log.debug(`Requesting meta page from USGS: ${item.metaUrl}`);
  const data = await fetch(metadataURL).then(res => res.json());
  const productMetadataLink = data.webLinks.find(link => link.title === 'Product Metadata')
  if (!productMetadataLink?.uri) {
    log.debug('No product link found');
    return;
  }
  log.debug(`Requesting product metadata page from USGS: ${productMetadataLink.uri}`);
  const productXml = await fetch(productMetadataLink.uri).then(res => res.text());
  const productData = xmlToObject(productXml).end({ format: 'object' });
  const projectionName = productData?.metadata?.spref?.horizsys?.planar?.mapproj?.mapprojn;
  if (!projectionName) {
    log.warn('No map projection found in product metadata');
    return;
  }
  log.debug(`Found projection name in XML: ${projectionName}`);

  // attempt to lookup CRS name in our local db
  const localRecord = crsList.find(item => item.name === projectionName);
  if (!localRecord) {
    log.warn(`Unable to lookup CRS by projection name: ${projectionName}`);
    return;
  }
  const code = `${localRecord.auth_name}:${localRecord.code}`;
  log.debug(`Found local CRS code ${code} for projection ${projectionName}`);

  // use our custom API to fetch the full CRS details
  const csrFetchUrl = `${OGSApiEndpoint}/csr/search?${new URLSearchParams({ query: code })}`;
  log.debug(`Searching found CRS code (${code}) for full CRS via API`);
  const crsResponse = await fetch(csrFetchUrl).then(res => res.json());
  if (!crsResponse.results?.length) {
    log.warn(`Unable to lookup full CRS by code: ${code}`);
    return;
  }
  const { name, id, unit } = crsResponse.results[0];
  log.debug(`Found full CRS (${code}) via API`, { name, id, unit });
  return {
    source: 'meta',
    name,
    id,
    unit
  };
}

async function refreshBounds(item) {
  console.log('refresh bounds', item.crs);
  if (!item?.crs?.id || !item?.bbox?.coordinates) {
    return {};
  }
  const proj4 = await getProjInfo(item.crs.id.authority, item.crs.id.code);

  // item.crs.proj4 = proj4;
  const newBounds = reprojectBounds(proj4, ...item.bbox.coordinates);

  const boundary = {
    'type': 'Feature',
    'geometry': {
      'type': 'Polygon',
      'coordinates': [newBounds]
    }
  };
  return { boundary, proj4 };
}

export async function getLAZInfo(item, abortController) {
  const inputUri = item._file || item.downloadURL;

  // we re-run this method when we set a new CRS
  // we skip the PDAL info command if we already grabbed the metadata once and just need to reproject the box
  if (item.crs?.source === 'user') {
    const refresh = await refreshBounds(item);
    console.log('refreshed', refresh);
    item.crs.proj4 = refresh.proj4;
    item.bbox.boundary = refresh.boundary;
    // const proj4 = await getProjInfo(item.crs.id.authority, item.crs.id.code);
    console.log('user set', item);
    return item;
    // item.crs.proj4 = proj4;
    // const newBounds = reprojectBounds(proj4, ...item.bbox.coordinates);

    // item.bbox.boundary = {
    //   'type': 'Feature',
    //   'geometry': {
    //     'type': 'Polygon',
    //     'coordinates': [newBounds]
    //   }
    // };
    // return item;
  }

  let infoResponse;
  let crs = item.crs;

  if (!crs) {
    try {
      log.debug('Using PDAL info to check the remote LAZ file headers for a CRS');
      infoResponse = await runPDALCommand('info', ['--metadata', inputUri], abortController);
      // let unit; // = item.unit.horizontal;
    } catch (error) {
      log.error(error);
    }
  }

  const projectedCRS = infoResponse?.metadata?.srs?.json?.components?.find(c => c.type === 'ProjectedCRS');
  if (projectedCRS) {
    console.log('found CRS', projectedCRS);
    crs = {
      unit: infoResponse?.metadata?.srs?.units,
      name: projectedCRS.base_crs.name,
      id: projectedCRS.base_crs.id,
      source: 'laz',
      proj4: infoResponse.metadata.srs.proj4
    };
    // unit = response?.metadata?.srs?.units;
  }

  const { minx, miny, maxx, maxy } = infoResponse?.metadata || {};
  let bbox = [minx, miny, maxx, maxy];
  let polygon = [];

  if (infoResponse?.metadata?.srs?.proj4) {
    log.debug(`Re-projecting bbox coordinates to ${CommonProjection}`, bbox);
    polygon = reprojectBounds(infoResponse.metadata.srs.proj4, minx, miny, maxx, maxy);
  }

  const returnValue = {
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
    // unit,
    crs
  };

  if (!returnValue.crs?.id) {
    // if we failed to parse the CRS from the LAZ file, we can try falling back to
    // scraping it from the USGS metadata
    const scraped = await scrapeCRSFromXML(item);
    if (scraped) {
      console.log('scraped', scraped);
      returnValue.crs = scraped;
      console.log('ite')
      const { boundary, proj4 } = await refreshBounds({ ...item, crs: scraped });
      returnValue.bbox.boundary = boundary;
      returnValue.crs.proj4 = proj4;
    }
  }
  console.log('returnValue', returnValue);
  return returnValue;
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

    // grab the input CRS from the first item in the list
    // we can still handle mixed projections in the data sources
    // but we'll re-project everything to the first in the list, for consistency
    const [first] = data._outputFiles.downloads;
    data._inputSRS = `${first.crs.id.authority}:${first.crs.id.code}`;
    let containsMixedProjections = false;
    data._outputFiles.downloads.forEach(item => {
      if (data._inputSRS !== `${first.crs.id.authority}:${first.crs.id.code}`) {
        containsMixedProjections = true;
      }
    });
    if (containsMixedProjections) {
      log.debug(`Data set contains mixed projections! Re-projecting everything to ${data._inputSRS}`);
    }
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
          // input SRS is our mapbox map's projection (EPSG:4326/WGS84)
          a_srs: 'EPSG:4326',
          polygon: cropWKT
        },
        // re-project to the projection of the first file
        ...containsMixedProjections ? [{
          type: 'filters.reprojection',
          // omit the in_srs and let PDAL auto-detect the one we set in the reader above
          out_srs: data._inputSRS,
        }] : [],
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
