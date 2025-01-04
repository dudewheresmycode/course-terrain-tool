// Modules to control application life and create native browser window
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import express from 'express';

import './utils/startup.js';
import { app as server } from './server/index.js';
import { verifyDependencies } from './tools/index.js';
import { installDependencies } from './tools/installer.js';

const PORT = process.env.PORT || 3133;

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

  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(process.cwd(), 'index.html'))
  // if (process.env.NODE_ENV === 'production') {
  //   // mainWindow.loadFile(path.join(process.cwd(), '../client/dist/index.html'))
  //   mainWindow.loadURL('http://localhost:3030');
  // } else {
  //   mainWindow.loadURL('http://localhost:3133');
  // }
  const isDevServer = process.argv.includes('devserver');
  console.log('running in dev mode');
  const PORT = isDevServer ? 3030 : 3133;
  mainWindow.loadURL(`http://localhost:${PORT}`);
  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {

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
    console.log(location);
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
      console.log(`Server running at http://localhost:${PORT}`);
      resolve();
    });
  });
}
