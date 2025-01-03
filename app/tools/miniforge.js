import fs from 'fs';
import path from 'path';
import {
  runCommand,
  getMiniCondaEnvironmentPath,
  downloadFile,
  execAsync,
  getInstallDirectory,
  getMinicondaDirectory,
} from './utils.js';
import {
  MC_WIN_INSTALLER_URL,
  MC_MAC_INSTALLER_URL,
  MC_MAC_ARM64_INSTALLER_URL,
} from '../constants.js';
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
    console.log('Conda environment not setup.');
    return;
  }
  if (!cachedPackages) {
    // const condaEnvDir = path.join(getInstallDirectory(), 'ctt-env');
    const res = await execAsync(`${condaBin} list -p "${condaEnvDir}" --json`);
    cachedPackages = JSON.parse(res.stdout);
    console.log('cachedPackages', cachedPackages);
  }
  const packageInList = cachedPackages.some((pkg) => pkg.name === packageName);
  if (packageInList) {
    return { type: 'conda', key: packageName };
  }
}

function getDownloadUrl() {
  if (process.platform === 'darwin') {
    if (process.arch === 'arm64') {
      return MINIFORGE_MAC_ARM;
    }
    return MINIFORGE_MAC_X86;
  } else if (process.platform === 'win32') {
    return MINIFORGE_WIN;
  }
}

export async function installMiniforge() {
  // https://github.com/conda-forge/miniforge?tab=readme-ov-file#non-interactive-install
  const downloadUrl = getDownloadUrl();
  console.log(downloadUrl);
  const localInstallerPath = path.join(
    getInstallDirectory(),
    path.basename(new URL(downloadUrl).pathname)
  );

  if (!fs.existsSync(localInstallerPath)) {
    // QUESTION: should we remove any previously downloaded files in this case?
    // await fs.promises.unlink(localSetupFile);
    await downloadFile(downloadUrl, localInstallerPath);
  }
  console.log(`Downloaded ${downloadUrl}\n-> ${localInstallerPath}`);

  const mfInstallDir = getMiniforgeDirectory();
  // ensure the directory exists
  mkdirSafe(mfInstallDir);

  /**
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
      ]
    );
  }

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
    '--prefix',
    condaEnvDir,
    // useful for testing
    // '--dry-run',
    '--channel',
    'conda-forge',
    ...installList,
  ]);
}