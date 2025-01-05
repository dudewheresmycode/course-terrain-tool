import path from 'path';
import fs from 'fs';

import BaseTask from './base.js';

const FEET_PER_METER = 3.28084;

function nearest(val) {
  return Math.round(val * 1000) / 1000;
}

function feet(meters) {
  return FEET_PER_METER * meters;
}

function meters(feet) {
  return feet / FEET_PER_METER;
}

function formatValues(value) {
  return [
    nearest(value), nearest(feet(value))
  ];
}

export class CreateCSVTask extends BaseTask {
  constructor({ outputDirectory }) {
    super();
    this.outputDirectory = outputDirectory;
  }

  async process(data) {
    const csvPath = path.join(this.outputDirectory, 'MinMax.csv');
    const innerStats = data._stats.inner;
    const outerStats = data._stats.outer;
    if (!innerStats) {
      throw new Error('Missing TIFF stats from previous pipeline step');
    }
    const rows = [];
    // TODO replace with actual min/max/height readings from terrain
    const innerValues = {
      min: innerStats?.min || -1,
      max: innerStats?.max || -1
    };
    innerValues.height = innerValues.max - innerValues.min;

    // convert all data to meters
    if (innerStats.unit === 'feet') {
      Object.keys(innerValues).forEach(key => {
        innerValues[key] = meters(innerValues[key]);
      });
    }
    // distances are always sent in kilometers
    innerValues.distance = data.distance * 1000;

    rows.push(['Inner Terrain', 'Meters', 'Feet']);
    rows.push(['Inner Size', ...formatValues(innerValues.distance)])
    rows.push(['Inner Max', ...formatValues(innerValues.max)])
    rows.push(['Inner Min', ...formatValues(innerValues.min)])
    rows.push(['Inner Height', ...formatValues(innerValues.height)])

    if (outerStats) {
      const outerValues = {
        min: outerStats?.min || -1,
        max: outerStats?.max || -1
      };
      outerValues.height = outerValues.max - outerValues.min;
      outerValues.distance = Math.round((data.distance + (data.outerDistance)) * 1000);

      if (outerStats?.unit === 'feet') {
        Object.keys(outerValues).forEach(key => {
          outerValues[key] = meters(outerValues[key]);
        });
      }

      rows.push(['', '']);
      rows.push(['', '']);

      rows.push(['Outer Terrain', 'Meters', 'Feet']);
      rows.push(['Outer Size', ...formatValues(outerValues.distance)])
      rows.push(['Outer Max', ...formatValues(outerValues.min)])
      rows.push(['Outer Min', ...formatValues(outerValues.max)])
      rows.push(['Outer Height', ...formatValues(outerValues.height)])

      rows.push(['', '']);
      rows.push(['', '']);

      rows.push(['UNITY Terrain (Outer) Transform Settings'])
      rows.push(['', 'X', 'Y', 'Z'])
      const unityOffsetX = (innerValues.distance - outerValues.distance) / 2;
      const unityOffsetZ = outerValues.min - innerValues.min;
      const unityOffsetY = (innerValues.distance - outerValues.distance) / 2;
      rows.push(['Position', nearest(unityOffsetX), nearest(unityOffsetZ), nearest(unityOffsetY)]);
    }

    const csvData = rows.map(row => {
      const vals = row.map(JSON.stringify);
      return vals.join(',');
    }).join('\n');

    await fs.promises.writeFile(csvPath, csvData);

    data._outputFiles.csv = csvPath;
  }
}

