import path from 'path';
import { promisify } from 'util';
import { spawn, exec } from 'child_process';
import pMap from 'p-map';
const execAsync = promisify(exec);

// const wmsSource = path.resolve('./server/wms/google.xml');
const wmsDirectory = path.resolve('./wms');

function runCommand(bin, options, onProgress) {
  let progess = 0;
  return new Promise((resolve, reject) => {
    const child = spawn(bin, options);
    child.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
      if (typeof onProgress === 'function') {
        onProgress(data);
      }
    });
    child.stdout.on('data', (data) => {
      const log = data.toString().trim();
      const int = parseInt(log, 10);
      if (data.toString().trim() === '.') {
        progess += 2;
      } else if (int) {
        progess = int;
      }
      if (progess) {
        console.log(`working: ${progess}%`);
      }
      if (typeof onProgress === 'function') {
        onProgress(data);
      }
    });
    child.on('close', (exitCode) => {
      console.log(`exited with code : ${exitCode}`);
      if (exitCode !== 0) {
        return reject();
      }
      resolve();
    });
  });
}

/**
 * requires:
 *  - gdalinfo
 *  - gdal_fillnodata
 */

/**
 * Get min/max and unit values from the GeoTIFF
 */
export async function getGeoTiffStats(geoTiffPath) {
  try {
    const res = await execAsync(`gdalinfo -mm -json "${geoTiffPath}"`);
    const data = JSON.parse(res.stdout);
    console.log(data);
    const [band] = data.bands;
    if (!band) {
      throw new Error('No band found in TIFF file');
    }
    const min = band.computedMin;
    const max = band.computedMax;
    const unit = band.unit.includes('feet') ? 'feet' : 'meters';

    return {
      min,
      max,
      unit
    };
  } catch (error) {
    console.log(error);
  }
}

/**
 * Interpolates missing elevation data in a DEM/TIFF file
 */
export async function fillNoData(sourceFile, filenamePrefix, resolution, outputDirectory) {
  const destFile = path.join(outputDirectory, `${filenamePrefix}_terrain_${Math.round(resolution * 100)}cm.tif`);
  await runCommand('gdal_fillnodata', [
    // '-md', '40',
    // '-si', '1',
    // '-interp', 'nearest',
    sourceFile, destFile
  ]);
  return destFile;
}
/**
 * Converts the GeoTIFF to a raw heightmap file using GDAL
 * Source: https://alastaira.wordpress.com/2013/11/12/importing-dem-terrain-heightmaps-for-unity-using-gdal/
 */
export async function geoTiffToRaw(sourceFile, stats) {
  const input = path.parse(sourceFile);
  const destFile = path.join(input.dir, `${input.name}_heightmap.raw`);
  // gdal_translate –ot UInt16 –scale –of ENVI –outsize 1025 1025 srtm_36_02_warped_cropped.tif heightmap.raw
  await runCommand('gdal_translate', [
    // '-ot', 'UInt16',
    // '-scale',
    // '-of', 'ENVI',
    '-of', 'ENVI', '-ot', 'UInt16',
    '-scale', stats.min, stats.max, '0', '65535',
    '-outsize', '4097', '4097',
    '-r', 'bilinear',
    sourceFile,
    destFile
  ]);
  return destFile;
}

// crop tif
export function cropGeoTIFFToCoordinates(coordinates) {
  // gdalwarp -of GTiff -crop_to_cutline -cutline #.geojson #.tif #.tif
  // const geoJSON = {
  //   'type': 'Feature',
  //   'geometry': {
  //     'type': 'Polygon',
  //     'coordinates': [coordinates]
  //   }
  // }
  // const wkt = `LINESTRING (30 10, 10 30, 40 40)`;
  const wkt = `POLYGON ((${coordinates.map(coord => coord.join(' ')).join(', ')}))`;
}

export function geoTIFFMerge() {
  // gdal_merge -o merge.tif -n 0 image1.tif image2.tif image3.tif image4.tif  
}

export async function geoTIFFHillShade(sourceFile, outputDirectory) {
  const destFile = path.join(outputDirectory, 'hillshade.tif');
  await runCommand('gdaldem', [ 'hillshade', '-compute_edges', sourceFile, destFile ]);
  return tifToJPG(destFile);
}

export async function tifToJPG(sourceFile, rgb = false) {
  const input = path.parse(sourceFile);
  const destFile = path.join(input.dir, `${input.name}_8192x8192.jpg`);
  await runCommand('gdal_translate', [
    '-of', 'JPEG',
    ...rgb ? ['-b', '1', '-b', '2', '-b', '3'] : ['-b', '1'],
    // '-b', '1', '-b', '2', '-b', '3',
    // '-b', '1',
    '-outsize', '8192', '8192',
    '-r', 'cubic',
    '-co', 'QUALITY=95',
    sourceFile,
    destFile
  ]);
  return destFile;
}

export async function generateSatelliteForSource(source, outputDirectory, filename, coordinates) {
  const destFile = path.join(outputDirectory, `${filename}_sat_${source}.tif`);

  const wmsSource = path.join(wmsDirectory, `${source}.xml`);
  console.log('wmsSource', wmsSource);
  
  const [xMin, yMin] = coordinates[0];
  const [xMax, yMax] = coordinates[2];
  const projwin = [xMin, xMax, yMin, yMax];
  console.log('projwin', projwin);
  // const progwin = coordinates.map(coord => coord.join(' ')).join(' ');
  await runCommand('gdal_translate', [
    '-of', 'GTiff',
    '-projwin', ...[xMin, yMin, xMax, yMax],
    '-projwin_srs', 'EPSG:4326',
    // '-co', 'QUALITY=95',
    // '-r', 'cubic',
    '-outsize', '8192', '8192',
    wmsSource,
    destFile
  ]);
  const destJPEG = await tifToJPG(destFile, true);
  return { tiff: destFile, jpeg: destJPEG };
  // return tifToJPG(destFile, true);

  // gdal_translate -of GTiff "C:\map data\Sydney\tiles.xml" "C:\map data\sydney.tiff" -projwin 151.033285 -33.743981 151.300567 -33.957583
  // gdal_translate
}
export async function generateSatellite(outputDirectory, filename, coordinates) {
  return pMap(['google', 'bing'], source => generateSatelliteForSource(source, outputDirectory, filename, coordinates), { concurrency: 1 });
}