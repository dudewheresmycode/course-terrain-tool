import path from 'node:path';
import { dialog } from 'electron';

import { getLAZInfo } from './tasks/pdal.js';
import pMap from 'p-map';

export default async function importFiles() {
  const openEvent = await dialog.showOpenDialog({
    title: 'Select files to import',
    filters: [{ name: 'Point Cloud (LAZ/LAS)', extensions: ['laz', 'las'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (!openEvent.canceled && openEvent.filePaths.length) {
    // importing local laz files
    // return openEvent.filePaths.map(() => {

    // });
    // const filesWithInfo = await pMap(openEvent.filePaths, async file => {
    //   const info = await getLAZInfo(file);
    //   return {
    //     _file: file,
    //     title: path.parse(file).name,
    //     ...info
    //   }
    // }, { concurrency: 2 });

    const items = openEvent.filePaths.map(file => {
      return {
        _file: file,
        title: path.parse(file).name,
      }
    });

    // const task = new GetLAZInfoTask();
    // const data = {
    //   _outputFiles: {
    //     imported: openEvent.filePaths
    //   }
    // };
    // await task.process(data);
    // console.log('openFile', openEvent.filePaths);
    // console.log(data._lazMetadata);
    return { source: 'local', items, format: 'LAZ' };
  }
}