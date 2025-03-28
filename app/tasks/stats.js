import path from 'path';
import fs from 'fs';

import BaseTask from './base.js';
import { CRSUnits, feetToMeters, usSurveyFeetToMeters } from '../utils/geo.js';

const FEET_PER_METER = 3.28084;
const PLAIN_TEXT_PADDING = 10;

function nearest(val) {
  return Math.round(val * 1000) / 1000;
}

/**
 * Converts meters to feet
 */
export function usFeet(meters) {
  return FEET_PER_METER * meters;
}
/**
 * Converts meters to feet
 */
export function feet(meters) {
  return FEET_PER_METER * meters;
}

/**
 * Converts feet to meters
 */
export function meters(feet) {
  return feet / FEET_PER_METER;
}

function formatValues(value) {
  return [
    nearest(value), nearest(feet(value))
  ];
}

export function formatTextFile(rows) {
  const maxStringLength = rows
    // ignore the long unity header
    .filter(row => !row[0].startsWith('UNITY'))
    .reduce((prev, row) => {
      const maxCellLength = row.sort((a, b) => a.length > b.length)[0].length;
      if (prev < 0 || maxCellLength > prev) {
        return maxCellLength;
      }
      return prev;
    }, -1);
  const cellSize = maxStringLength + PLAIN_TEXT_PADDING;
  const numColumns = rows[0].length;
  const horizontalSpace = numColumns * cellSize;

  const divider = '-'.repeat(horizontalSpace) + '\n';
  let output = divider;
  let emptyPrevLine = true;

  for (const [index, row] of rows.entries()) {
    const emptyRow = row.filter(Boolean).length === 0;
    if (emptyRow) {
      output += '\n';
    }
    output += row.map(cell => `${cell}`.padEnd(cellSize, ' ')).join('') + '\n';
    if (index === 0 || emptyPrevLine) {
      output += divider;
    }
    emptyPrevLine = emptyRow;
  }
  return output;
}

export function formatCSVFile(rows) {
  return rows.map(row => {
    const vals = row.map(JSON.stringify);
    return vals.join(', ');
  }).join('\n');
}

export class CreateCSVTask extends BaseTask {
  constructor({ outputDirectory }) {
    super();
    this.id = 'stats';
    this.label = 'Creating CSV file with min/max values';
    this.outputDirectory = outputDirectory;
  }

  async process(data) {
    const txtPath = path.join(this.outputDirectory, 'MinMax.txt');
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
    // if (innerStats.unit === 'feet') {
    if (data._inputCRS.unit === CRSUnits.Feet) {
      Object.keys(innerValues).forEach(key => {
        innerValues[key] = feetToMeters(innerValues[key]);
      });
    } else if (data._inputCRS.unit === CRSUnits.USFeet) {
      Object.keys(innerValues).forEach(key => {
        innerValues[key] = usSurveyFeetToMeters(innerValues[key]);
      });
    }
    // distances are always sent in kilometers
    innerValues.distance = data.distance * 1000;

    rows.push(['Inner Terrain', 'Meters', 'Feet']);
    rows.push(['Inner Size', ...formatValues(innerValues.distance)])
    rows.push(['Inner Min', ...formatValues(innerValues.min)])
    rows.push(['Inner Max', ...formatValues(innerValues.max)])
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
      rows.push(['Outer Min', ...formatValues(outerValues.min)])
      rows.push(['Outer Max', ...formatValues(outerValues.max)])
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

    const csvData = formatCSVFile(rows);

    await fs.promises.writeFile(csvPath, csvData);


    const textData = formatTextFile(rows);
    await fs.promises.writeFile(txtPath, textData);


    data._outputFiles.csv = csvPath;
    data._outputFiles.txt = txtPath;
  }
}

