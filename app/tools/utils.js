import { exec, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { app } from 'electron';
import axios from 'axios';
import log from 'electron-log';

import { CTT_DIR_NAME } from '../constants.js';

export const execAsync = promisify(exec);

export function getInstallDirectory() {
  return path.join(app.getPath('home'), CTT_DIR_NAME);
}

export function runCommand(bin, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, options);
    child.stderr.on('data', (data) =>
      log.debug(`[${path.basename(bin)}] ${data}`)
    );
    child.stdout.on('data', (data) =>
      log.debug(`[${path.basename(bin)}] ${data}`)
    );
    child.on('close', (code) => {
      log.debug(`[${path.basename(bin)}] exited with code: ${code}`);
      if (code !== 0) {
        return reject();
      }
      resolve();
    });
  });
}

export async function downloadFile(url, filePath) {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    // TODO: implement progress bar in client
    // onDownloadProgress: (progressEvent) => {},
  });
  const outputStream = fs.createWriteStream(filePath);
  let error;
  return new Promise((resolve, reject) => {
    outputStream.on('error', (err) => {
      error = err;
      reject(err);
      outputStream.close();
    });
    outputStream.on('close', () => {
      if (!error) {
        resolve(filePath);
      }
    });
    response.data.pipe(outputStream);
  });
}

export async function findBinaryPath(cmd) {
  try {
    const checkApp = process.platform === 'win32' ? 'where' : 'which';
    const response = await execAsync(`${checkApp} ${cmd}`);
    const binPath = response.stdout.toString().trim();
    if (binPath.length) {
      return binPath;
    }
  } catch (_error) {
    console.warn(`[tools] Check for ${cmd} failed`, _error.message);
  }
  return null;
}
