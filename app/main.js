// Modules to control application life and create native browser window
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import express from 'express';
import log from 'electron-log';
import electronUpdater from 'electron-updater';

import './utils/startup.js';
import { app as server } from './server/index.js';
import { verifyDependencies } from './tools/index.js';
import { installDependencies } from './tools/installer.js';

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

  const isDevServer = process.argv.includes('devserver');
  const port = isDevServer ? 3030 : 3133;
  log.debug(`Running in ${isDevServer ? 'development' : 'production'} mode on port ${port}`);
  mainWindow.loadURL(`http://localhost:${port}`);
  if (isDevServer) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
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

  await startServer();

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

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
    const folder = await dialog.showSaveDialog({
      title: 'Create Course Folder',
      nameFieldLabel: 'Course Name',
      // defaultPath: app.getPath('home'),
      message: 'Select the location to create your course folder',
      buttonLabel: 'Create Course Folder',
      // properties: ['openDirectory', 'createDirectory', 'promptToCreate']
    });
    return folder;
  });
  ipcMain.handle('quit-app', (event) => {
    log.info('Quitting app...');
    app.quit();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function startServer() {
  return new Promise(resolve => {
    const distPath = path.resolve(app.getAppPath(), './client/dist');
    server.use(express.static(distPath));
    server.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

    server.listen(PORT, () => {
      log.info(`Server running at http://localhost:${PORT}`);
      resolve();
    });
  });
}
