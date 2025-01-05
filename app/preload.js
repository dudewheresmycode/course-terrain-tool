
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