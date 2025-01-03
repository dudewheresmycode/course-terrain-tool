const { contextBridge, ipcRenderer } = require("electron");
/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('hello from preload!');
});

contextBridge.exposeInMainWorld('courseterrain', {
  verifyDependencies: async () => {
    return ipcRenderer.invoke('dependency-check');
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
    console.log('linkout', location);
    // shell.openExternal(location);
    ipcRenderer.invoke('link-out', location);
  },
  quitApp: () => {
    ipcRenderer.invoke('quit-app');
  }
});
// window.openExternal = (location) => {
//   console.log('OPEN', location);
//   // shell.openExternal(location);
// }