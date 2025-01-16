import path from 'path';
import fs from 'fs';
import { create } from 'xmlbuilder2';

import BaseTask from './base.js';
import { SatelliteSources } from '../constants.js';

const FEET_PER_METER = 3.28084;
const PLAIN_TEXT_PADDING = 10;

function imageTag(size, label, href) {
  return href ? [
    {
      '@width': size,
      '@height': size,
      '@id': label,
      '@preserveAspectRatio': 'none',
      '@xlink:href': href
    }
  ] : [];
}

export class CreateSVGTask extends BaseTask {
  constructor({ outputDirectory }) {
    super();
    this.id = 'svg';
    this.label = 'Creating SVG template';
    this.outputDirectory = outputDirectory;
  }

  async process(data) {
    const foldername = path.parse(this.outputDirectory).name;
    const svgPath = path.join(this.outputDirectory, `${foldername}_inner.svg`);

    const size = data.distance * 1000; // convert kilometers to meters
    const googleSat = data._outputFiles.inner?.satellite?.[SatelliteSources.Google];
    const bingSat = data._outputFiles.inner?.satellite?.[SatelliteSources.Bing];
    const hillshade = data._outputFiles.hillshade;

    const obj = {
      svg: {
        '@version': '1.1',
        '@id': 'svg1',
        '@width': `${size}mm`,
        '@height': `${size}mm`,
        '@viewBox': `0 0 ${size} ${size}`,

        '@sodipodi:docname': 'BaseCourse_Inner.svg',
        g: {
          '@inkscape:label': 'Overlays',
          '@inkscape:groupmode': 'layer',
          '@id': 'overlays',
          image: [
            ...imageTag(size, 'Satellite-Google', googleSat),
            ...imageTag(size, 'Satellite-Bing', bingSat),
            ...imageTag(size, 'Hillshade', hillshade),
          ]
        }
      }
    };

    const doc = create(obj);
    const xml = doc.end({ prettyPrint: true });
    console.log(xml);

    await fs.promises.writeFile(svgPath, xml);
    data._outputFiles.svg = svgPath;
  }
}

