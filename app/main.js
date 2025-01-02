// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import express from 'express';

import '../server/utils/startup.js';
import { app as server } from '../server/server/index.js';
import { verifyDependencies } from './conda/installer.js';

const PORT = process.env.PORT || 3133;

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.resolve(app.getAppPath(), './preload.js'),
      // nodeIntegrationInWorker: true,
      // contextIsolation: true,
      // nodeIntegration: true,
    }
  });

  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(process.cwd(), 'index.html'))
  if (process.env.CLIENT_DEV_MODE) {
    // mainWindow.loadFile(path.join(process.cwd(), '../client/dist/index.html'))
    mainWindow.loadURL('http://localhost:3030');
  } else {
    mainWindow.loadURL('http://localhost:3133');
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  
  await verifyDependencies();
  
  await startServer();

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.handle('linkout', (event, location) => {
    console.log(location);
    shell.openExternal(location);
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
    
    // server.get('/preload.js', (req, res) => res.sendFile(path.join(process.cwd(), './preload.js')));
    const distPath = path.resolve(app.getAppPath(), '../client/dist');
    console.log('distPath', distPath);
    server.use(express.static(distPath));
    server.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

    server.listen(PORT, () => {
      // we set CTC_DEBUG when we run the app in develop mode and 
      // proxy the server behind the webpack dev server
      // so we hide this log message to avoid confusion about which address the user sees
      if (!process.env.CTC_DEBUG) {
        console.log(`Server running at http://localhost:${PORT}`);
      }
      resolve();
    });
  });
}
