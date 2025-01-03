import path from 'path';
import { app } from 'electron';

import mkdirSafe from './mkdirSafe.js';

const APP_DATA_DIR = 'ExtraTools';

export default function ensureAppDirectory() {
  const appData = app.getPath('userData');
  const appDataPath = path.join(appData, APP_DATA_DIR);
  mkdirSafe(appDataPath);
  return appDataPath;
}