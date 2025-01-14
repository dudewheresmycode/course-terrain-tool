
const { contextBridge, ipcRenderer } = require('electron');
/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

contextBridge.exposeInMainWorld('courseterrain', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',

  searchCRSList: (query) => ipcRenderer.invoke('search-crs-list', query),
  fetchCRSList: () => ipcRenderer.invoke('get-crs-list'),
  cancelMetadata: () => {
    return ipcRenderer.invoke('cancel-metadata');
  },
  getMetadata: async (dataSource) => {
    return ipcRenderer.invoke('get-metadata', dataSource);
  },
  getBounds: (dataSource) => {
    return ipcRenderer.invoke('get-bounds', dataSource);
  },
  importFiles: () => {
    return ipcRenderer.invoke('import-files');
  },
  folderReveal: (outputFolder) => {
    return ipcRenderer.invoke('reveal-folder', outputFolder);
  },
  submitJob: (jobData) => {
    return ipcRenderer.invoke('submit-job', jobData);
  },
  cancelJob: () => {
    return ipcRenderer.invoke('cancel-job');
  },
  verifyDependencies: async () => {
    return ipcRenderer.invoke('dependency-check');
  },
  selectedMapStyle: () => {
    return ipcRenderer.invoke('selected-map-style');
  },
  addEventListener: (eventName, callback) => {
    return ipcRenderer.on(eventName, callback);
  },
  removeEventListener: (eventName, callback) => {
    return ipcRenderer.off(eventName, callback);
  },
  installTools: () => {
    return ipcRenderer.send('install-tools');
  },
  openExternal: (location) => {
    ipcRenderer.invoke('link-out', location);
  },
  selectFolder: () => {
    return ipcRenderer.invoke('select-folder');
  },
  quitApp: () => {
    ipcRenderer.invoke('quit-app');
  }
});
// window.openExternal = (location) => {
//   console.log('OPEN', location);
//   // shell.openExternal(location);
// }