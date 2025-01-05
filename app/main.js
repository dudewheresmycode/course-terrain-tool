// Modules to control application life and create native browser window
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
// import express from 'express';
import log from 'electron-log';
import electronUpdater from 'electron-updater';

import './utils/startup.js';
// import { app as server } from './server/index.js';
import { verifyDependencies } from './tools/index.js';
import { installDependencies } from './tools/installer.js';
import { buildMenu } from './menu.js';
// TODO: move and update imports when we kill server
import { JobQueue } from './jobs.js';

export const jobQueue = new JobQueue();

const PORT = process.env.PORT || 3133;

// initializes the logger for any renderer process
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

  ipcMain.handle('select-folder', () => {
    return dialog.showSaveDialog({
      title: 'Create Course Folder',
      nameFieldLabel: 'Course Folder Name',
      message: 'Select the location to create your course folder',
      buttonLabel: 'Create Course Folder',
    });
  });

  ipcMain.handle('quit-app', (event) => {
    log.info('Quitting app...');
    app.quit();
  });

  ipcMain.handle('reveal-folder', (event, folder) => {
    shell.showItemInFolder(folder);
  });

  ipcMain.handle('submit-job', (event, jobData) => {
    const job = jobQueue.add(jobData);
    job.on('progress', progress => {
      console.log('progress', progress);
      event.sender.send('job-progress', progress);
    });
    job.on('error', error => {
      console.log('error', error);
      event.sender.send('job-error', error);
    });
    job.on('finished', data => {
      console.log('finished', data);
      event.sender.send('job-finished', data);
    });
  });

  ipcMain.handle('cancel-job', async (event) => {
    log.info('Canceling job app...');
    await jobQueue.cancelJob();
  });

});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// function startServer() {
//   return new Promise(resolve => {
//     const distPath = path.resolve(app.getAppPath(), './client/dist');
//     server.use(express.static(distPath));
//     server.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

//     server.listen(PORT, () => {
//       log.info(`Server running at http://localhost:${PORT}`);
//       resolve();
//     });
//   });
// }
