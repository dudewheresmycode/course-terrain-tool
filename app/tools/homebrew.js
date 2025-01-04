import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { runCommand } from './utils.js';

const execAsync = promisify(exec);

export async function checkBrewSupport() {
  try {
    const res = await execAsync('which brew');
    const brewpath = res.stdout.trim();
    if (brewpath) {
      return brewpath;
    }
  } catch (_error) {
    return;
  }
}

export async function installToolsWithBrew(installList) {
  process.env.HOMEBREW_NO_AUTO_UPDATE = '1';
  process.env.NONINTERACTIVE = '1';
  return runCommand('brew', ['install', ...installList]);
}
