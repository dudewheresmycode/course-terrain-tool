import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import {
  runCommand,
  downloadFile,
  execAsync,
  getInstallDirectory
} from './utils.js';
import mkdirSafe from '../utils/mkdirSafe.js';
import {
  MF_DIR_NAME,
  CONDA_ENV_NAME,
  MINIFORGE_MAC_X86,
  MINIFORGE_MAC_ARM,
  MINIFORGE_WIN
} from '../constants.js';

let cachedPackages;


export function getMiniforgeDirectory() {
  return path.join(getInstallDirectory(), MF_DIR_NAME);
}

export function getCondaEnvironmentPath() {
  return path.join(getInstallDirectory(), CONDA_ENV_NAME);
}

export function getCondaScriptPath() {
  return path.join(
    getMiniforgeDirectory(),
    process.platform === 'win32' ? 'Scripts/conda.exe' : 'bin/conda'
  );
}

export async function verifyCondaPackage(condaBin, packageName) {
  const condaEnvDir = getCondaEnvironmentPath();
  // only run this fetch once
  if (!fs.existsSync(condaEnvDir)) {
    log.warn('Conda environment not setup yet');
    return;
  }
  if (!cachedPackages) {
    // const condaEnvDir = path.join(getInstallDirectory(), 'ctt-env');
    const res = await execAsync(`${condaBin} list -p "${condaEnvDir}" --json`);
    cachedPackages = JSON.parse(res.stdout);
    log.debug(`Received ${cachedPackages.length} conda packages`);
  }
  const packageInList = cachedPackages.some((pkg) => pkg.name === packageName);
  if (packageInList) {
    return packageName;
  }
}

function getDownloadUrl() {
  const { platform } = process;
  if (platform === 'darwin') {
    if (process.arch === 'arm64') {
      return MINIFORGE_MAC_ARM;
    }
    return MINIFORGE_MAC_X86;
  } else if (platform === 'win32') {
    return MINIFORGE_WIN;
  } else {
    throw new Error(`Unsupported platform ${platform}`);
  }
}

export async function installMiniforge() {
  const downloadUrl = getDownloadUrl();

  const localInstallerPath = path.join(
    getInstallDirectory(),
    path.basename(new URL(downloadUrl).pathname)
  );

  if (!fs.existsSync(localInstallerPath)) {
    // QUESTION: should we remove any previously downloaded files in this case?
    // await fs.promises.unlink(localSetupFile);
    await downloadFile(downloadUrl, localInstallerPath);
    log.debug(`Finished download: ${downloadUrl} -> ${localInstallerPath}`);
  }

  const mfInstallDir = getMiniforgeDirectory();
  // ensure the directory exists
  mkdirSafe(mfInstallDir);

  /**
  * https://github.com/conda-forge/miniforge?tab=readme-ov-file#non-interactive-install
  * Installs Miniforge3 24.11.0-0
  * -b           run install in batch mode (without manual intervention),
  *              it is expected the license terms (if any) are agreed upon
  * -f           no error if install prefix already exists
  * -h           print this help message and exit
  * -p PREFIX    install prefix, defaults to /Users/brianrobinson/miniforge3, must not contain spaces.
  * -s           skip running pre/post-link/install scripts
  * -u           update an existing installation
  * -t           run package tests after installation (may install conda-build)
  */
  if (process.platform === 'darwin') {
    await runCommand('bash', [
      localInstallerPath,
      '-b',
      '-u',
      '-p',
      mfInstallDir,
    ]);
  } else if (process.platform === 'win32') {
    log.info(`Installing miniforge to ${mfInstallDir}`);
    await runCommand(
      'start',
      [
        '/wait',
        '',
        localInstallerPath,
        '/InstallationType=JustMe',
        '/RegisterPython=0',
        '/S',
        `/D=${mfInstallDir}`
      ],
      { shell: true }
    );
  }

  await fs.promises.unlink(localInstallerPath);

  const scriptPath = getCondaScriptPath();
  if (fs.existsSync(scriptPath)) {
    return scriptPath;
  }
}

export async function installToolsWithConda(condaBin, installList) {
  const condaEnvDir = getCondaEnvironmentPath();
  if (fs.existsSync(condaEnvDir)) {
    return;
  }
  await runCommand(condaBin, [
    'create',
    '--yes',
    '--json',
    '--prefix',
    condaEnvDir,
    // useful for testing
    // '--dry-run',
    '--channel',
    'conda-forge',
    ...installList,
  ]);

  if (process.platform === 'win32') {
    log.info('Initializing conda...');
    await runCommand(condaBin, [
      'init',
      '--json',
      '--user'
    ]);
  }
  log.info('Cleaning up unused conda files...');
  await condaClean(condaBin)
}

export function condaClean(condaBin) {
  return runCommand(condaBin, ['clean', '-all', '-y']);
}