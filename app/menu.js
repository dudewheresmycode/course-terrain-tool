import { app, Menu, ipcMain, shell } from 'electron';
import pkg from '../package.json' with { type: 'json' };

const isMac = process.platform === 'darwin'

const HelpUrl = 'https://ctt.opengolfsim.com';
const BugReportUrl = 'https://forms.gle/X14RtojJe9hWYbS29';

const MapStyles = {
  'satellite-streets-v12': 'Satellite',
  'satellite-v9': 'Satellite (Image Only)',
  'standard': 'Streets',
};

export function getSelectedMapStyle() {
  const menu = Menu.getApplicationMenu();
  const viewMenu = menu.items.find(item => item.id === 'view');
  const mapMenu = viewMenu?.submenu?.items?.find(item => item.id === 'map-style');
  // const checkedItem = mapMenu.items.find(item => item.checked);
  const checkedItem = mapMenu?.submenu?.items?.find(item => item.checked);
  if (checkedItem?.id) {
    return checkedItem.id;
  }
  return Object.keys(MapStyles)[0];
}

export function buildMenu(webContents) {
  ipcMain.handle('selected-map-style', getSelectedMapStyle);

  app.setAboutPanelOptions({
    iconPath: '../resources/icon.ico',
    applicationName: app.name,
    applicationVersion: app.version,
    version: `${pkg.version} BETA`,
    credits: 'github.com/dudewheresmycode',
    website: 'https://ctt.opengolfsim.com/',
    copyright: '2025 dudewheresmycode'
  });

  const template = [
    // { role: 'appMenu' }
    ...(isMac
      ? [{
        label: app.name,
        submenu: [
          { role: 'about', },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }]
      : []),

    ...!isMac ? [{
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    }] : [],

    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },

    {
      label: 'View',
      id: 'view',
      submenu: [
        {
          label: 'Map Style',
          id: 'map-style',
          submenu: Object.keys(MapStyles).map((key, index) => {
            return {
              checked: index === 0,
              label: MapStyles[key],
              id: key,
              type: 'radio',
              click: () => {
                webContents.send('map-layer-change', key);
              }
            }
          }),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ]
          : [
            { role: 'close' }
          ])
      ]
    },
    {
      role: 'help',
      submenu: [
        ...!isMac ? [{ role: 'about', }] : [],
        {
          label: 'Help',
          click: async () => {
            await shell.openExternal(HelpUrl)
          }
        },
        {
          label: 'Report an Issue',
          click: async () => {
            await shell.openExternal(BugReportUrl)
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}