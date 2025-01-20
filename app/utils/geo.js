import proj4 from 'proj4';
import { feet } from '../tasks/stats.js';
import mproj from 'mproj';

export const WGS84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

// earth radius (in km)
const r_earth = 6378;

export function addKilometers(latlng, kilometers, unit) {
  const [lng, lat] = latlng;

  // units: "kilometers",
  // bboxPolygon(bbox(circle(_circle.center, 0.5, { steps: 64 })))

  const meters = kilometers * 1000;
  if (unit.startsWith('meter') || unit === 'm') {
    // return [lng + feet(meters), lat + feet(meters)];
    return [lng + meters, lat + meters];
  } else if (unit === 'foot' || unit === 'feet') {
    return [lng + feet(meters), lat + feet(meters)];
  }
  // return degrees by default?
  const new_longitude = lng + (kilometers / r_earth) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
  const new_latitude = lat + (kilometers / r_earth) * (180 / Math.PI);
  return [new_longitude, new_latitude];
}

export function getBoundsForDistance(center, distance, unit) {
  const [xmin, ymin] = addKilometers(center, -(distance / 2), unit);
  const [xmax, ymax] = addKilometers(center, distance / 2, unit);
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
    console.log('point', point);
    return proj4(
      sourceProj4,
      destProj4,
      point
    );
  });
}
