import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';
import electronUpdater from 'electron-updater';

import './utils/startup.js';

import { verifyDependencies } from './tools/index.js';
import { installDependencies } from './tools/installer.js';
import { buildMenu } from './menu.js';

import { JobQueue } from './jobs.js';
import { getLAZInfo } from './tasks/pdal.js';
import crsList from './crs-list.json' with { type: 'json' };
import pMap from 'p-map';

export const jobQueue = new JobQueue();

const PORT = process.env.PORT || 3133;

// initializes the logger for any renderer process?
log.initialize();

// initialize the auto-updater
const { autoUpdater } = electronUpdater;
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    backgroundColor: '#222222',
    webPreferences: {
      preload: path.resolve(app.getAppPath(), './app/preload.js'),
      // nodeIntegrationInWorker: true,
      // contextIsolation: true,
      // nodeIntegration: true,
    }
  });
  buildMenu(mainWindow.webContents);

  const isDevServer = process.argv.includes('devserver');
  // const port = isDevServer ? 3030 : 3133;
  log.debug(`Running in ${isDevServer ? 'development' : 'production'} mode`);
  if (isDevServer) {
    // load the webpack development server
    mainWindow.loadURL('http://localhost:3030');
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.resolve(app.getAppPath(), './client/dist/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  log.info('App starting up...');


  // TODO: Customize experience?
  // https://github.com/iffy/electron-updater-example/blob/master/main.js
  autoUpdater.checkForUpdatesAndNotify();


  // await startServer();

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // ipcMain.on('register-map', (event) => {
  //   // event.sender
  //   connectMap(event.sender);
  // });
  ipcMain.on('install-tools', async (event) => {
    event.sender.send('install-progress', { text: 'Setting up installation' });
    await installDependencies(event.sender);
  });

  ipcMain.handle('dependency-check', async (event) => {
    return verifyDependencies();
  });

  ipcMain.handle('link-out', (event, location) => {
    log.info(`Opening external link ${location}`);
    shell.openExternal(location);
  });

  ipcMain.handle('select-folder', async () => {
    // return dialog.showOpenDialog({
    //   title: 'Output Folder',
    //   buttonLabel: 'Select Output Folder',
    //   properties: ['openDirectory', 'createDirectory']
    // })
    const result = await dialog.showSaveDialog({
      title: 'Export Terrain Data',
      properties: ['createDirectory'],
      nameFieldLabel: 'Course Folder Name',
      message: 'Create your course folder',
      buttonLabel: 'Create Course Folder',
    });
    if (!result.canceled && result.filePath) {
      console.log(result.filePath);
      if (fs.existsSync(result.filePath)) {
        const error = 'This folder already exists. Please select a unique folder name for each export (e.g. My_Course_V3)';
        await dialog.showErrorBox('Output Folder', error);
        return { error };
        // return { error: 'This folder already exists. Please select a unique folder name for each export (e.g. My_Course_V3)' };
      }
      return { filePath: result.filePath };
    }
  });

  ipcMain.handle('quit-app', (event) => {
    log.info('Quitting app...');
    app.quit();
  });

  ipcMain.handle('reveal-folder', (event, folder) => {
    shell.showItemInFolder(folder);
  });

  ipcMain.handle('submit-job', (event, jobData) => {
    log.debug('Submitting job with data:', jobData);
    const job = jobQueue.add(jobData);
    job.on('progress', progress => {
      event.sender.send('job-progress', progress);
    });
    job.on('error', error => {
      log.error('Job Error', error);
      event.sender.send('job-error', error);
    });
    job.on('finished', data => {
      log.info('Job Finished', data);
      event.sender.send('job-finished', data);
    });
  });

  ipcMain.handle('cancel-job', async (event) => {
    log.info('Canceling job app...');
    try {
      await jobQueue.cancelJob();
    } catch (error) {
      log.warn(error);
    }
  });

  ipcMain.handle('import-files', async (event) => {
    log.info('Importing files...');
    const openEvent = await dialog.showOpenDialog({
      title: 'Select files to import',
      filters: [{ name: 'Point Cloud (LAZ/LAS)', extensions: ['laz', 'las'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (!openEvent.canceled && openEvent.filePaths.length) {
      return openEvent.filePaths.map(file => ({
        _file: file,
        title: path.parse(file).name,
        source: 'local'
      }));
    }
  });

  ipcMain.handle('get-crs-list', () => {
    return crsList;
  });
  ipcMain.handle('search-crs-list', (event, query) => {
    const parts = query.split(/[:\s\-_]/g);
    return crsList.filter(option => {
      return parts.some(part => {
        const search = new RegExp(part, 'ig');
        return search.test(option.auth_name) ||
          search.test(option.code) ||
          search.test(option.name);
      });
    });
  });

  let metadataSignal = new AbortController();
  ipcMain.handle('cancel-metadata', async (event, items) => {
    metadataSignal.abort();
  });

  ipcMain.handle('get-metadata', async (event, items) => {
    const copy = await pMap(items, async item => {
      try {

        const info = await getLAZInfo(item, { signal: metadataSignal.signal, timeout: 20_000 });
        event.sender.send('file-metadata', { ...item, ...info });

        return {
          ...item,
          ...info
        }
      } catch (error) {
        log.error('error', error);
        event.sender.send('file-metadata', { ...item, error: 'Error Fetching CRS' });
      }
    }, { concurrency: 4, signal: metadataSignal.signal }).catch(error => log.error(error));

    return copy;
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  app.quit();
});
