import { createRequire } from 'module'
import proj4 from 'proj4';
import log from 'electron-log';
import { feet } from '../tasks/stats.js';
const requireCRS = createRequire(import.meta.url)

export const WGS84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';
// +proj=longlat +datum=WGS84 +no_defs +type=crs

// our mapbox map
export const EPSG_4326 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

// google maps, bing
export const EPSG_3857 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs';

// earth radius (in km)
const r_earth = 6378;

export const CRSUnits = {
  Feet: 'feet',
  // us survey foot
  USFeet: 'us-feet',
  Meters: 'meters',
  Degrees: 'degrees'
};

export const FOOT_PER_METER = 3.28084;
export const US_FOOT_PER_METER = 3.2808333333;

const METER_PER_US_FOOT = 0.3048006096;
const METER_PER_FOOT = 0.3048;

function feetToMeters(feet) {
  return feet * METER_PER_FOOT;
}

function metersToFeet(meters) {
  return meters * FOOT_PER_METER;
}

function metersToUSSurveyFeet(meters) {
  return meters * US_FOOT_PER_METER;
}
// US Survey Feet to meters
function usFeetToMeters(feet) {
  return feet * METER_PER_US_FOOT;
}

export function epsgLookup(epsgCode) {
  return requireCRS(`epsg-index/s/${epsgCode}.json`)
}

export function detectUnit(unit) {
  const isDegrees = /^deg/i.test(unit);
  const isMeters = /^met|meter|metre|^m$/i.test(unit);
  const isUSSurveyFoot = /us-ft|survey|us/i.test(unit);
  const isFeet = /foot|feet|ft/i.test(unit);
  if (isUSSurveyFoot) {
    return CRSUnits.USFeet;
  } else if (isFeet) {
    return CRSUnits.Feet;
  } else if (isMeters) {
    return CRSUnits.Meters;
  } else if (isDegrees) {
    return CRSUnits.Degrees;
  }
  log.warn(`Unable to detect CRS unit (${unit}), falling back to meters`);
  return CRSUnits.Meters;
}

export function addKilometers(latlng, kilometers, crs) {
  const [lng, lat] = latlng;
  // how many meters the inner/outer box is
  const meters = kilometers * 1000;

  let rawUnit = crs.unit;
  // first we try and normalize any EPSG-based CRS cors by using our internal list of units
  if (crs?.id?.authority === 'EPSG' && crs?.id?.code) {
    const epsg = epsgLookup(crs.id.code)
    if (epsg?.unit) {
      log.info(`Found EPSG code. Overriding unit from ${rawUnit} to ${epsg.unit}`);
      rawUnit = epsg.unit;
    }
  }
  log.debug(`Attempting to parse unit ${rawUnit}`);
  // const isUSFoot = /survey foot|feet|ft/i.test(unit);
  // const isFoot = /foot|feet|ft/i.test(unit);
  const crsUnit = detectUnit(rawUnit);
  log.debug(`Parsed unit: ${crsUnit}`);

  if (crsUnit === CRSUnits.USFeet) {
    return [lng + metersToUSSurveyFeet(meters), lat + metersToUSSurveyFeet(meters)];
  } else if (crsUnit === CRSUnits.Feet) {
    return [lng + metersToFeet(meters), lat + metersToFeet(meters)];
  } else if (crsUnit === CRSUnits.Degrees) {
    const new_longitude = lng + (kilometers / r_earth) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    const new_latitude = lat + (kilometers / r_earth) * (180 / Math.PI);
    return [new_longitude, new_latitude];
  }

  // assume meters as default?
  return [lng + meters, lat + meters];
}

export function getBoundsForDistance(center, distance, crs) {
  const [xmin, ymin] = addKilometers(center, -(distance / 2), crs);
  const [xmax, ymax] = addKilometers(center, distance / 2, crs);
  return [
    [xmin, ymin],
    [xmax, ymin],
    [xmax, ymax],
    [xmin, ymax],
    [xmin, ymin],
  ]
}

export function reprojectBounds(sourceProj4, destProj4, ...coordinates) {
  return [
    ...coordinates
  ].map(point => {
    return proj4(
      sourceProj4,
      destProj4,
      point
    );
  });
}
