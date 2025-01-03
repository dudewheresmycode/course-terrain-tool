import { exec, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { app } from 'electron';
import axios from 'axios';

import { CTT_DIR_NAME, MC_DIR_NAME, MC_ENV_NAME } from '../constants.js';

export const execAsync = promisify(exec);

export function getInstallDirectory() {
  return path.join(app.getPath('home'), CTT_DIR_NAME);
}

export function getMinicondaDirectory(name) {
  return path.join(getInstallDirectory(), name ? name : MC_DIR_NAME);
}

export function getMiniCondaEnvironmentPath() {
  return path.join(getInstallDirectory(), MC_ENV_NAME);
}

export function getMiniCondaScriptPath() {
  return path.join(
    getMinicondaDirectory(),
    process.platform === 'win32' ? 'Scripts/conda.exe' : 'bin/conda'
  );
}

export function runCommand(bin, options, shell) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, options, shell ? { shell } : undefined);
    child.stderr.on('data', (data) =>
      console.log(`[${path.basename(bin)}]: ${data}`)
    );
    child.stdout.on('data', (data) =>
      console.log(`[${path.basename(bin)}]: ${data}`)
    );
    child.on('close', (code) => {
      console.log(`exited: ${code}`);
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
    onDownloadProgress: (progressEvent) => {
      console.log('progressEvent', progressEvent);
    },
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
        console.log('finished downloading file');
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
    console.log('binPath', binPath);
    if (binPath.length) {
      return binPath;
    }
  } catch (error) {
    console.log('binary-check failed', error.message);
  }
  return null;
}
