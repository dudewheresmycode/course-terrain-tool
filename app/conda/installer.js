import path from 'node:path';
import fs from 'node:fs';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import proc from 'node:process';
import axios from 'axios';
import { app } from 'electron';
import { GDAL_BINARIES } from '../constants.js';
import ensureAppDirectory from '../utils/appDirectory.js';
import mkdirSafe from '../utils/mkdirSafe.js';

let tools;

const MINICONDA_DIR_NAME = 'miniconda';
const MINICONDA_ENV_NAME = 'ctt-env';

const execAsync = promisify(exec);


const WIN_INSTALLER_URL = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe';
const MAC_INSTALLER_URL = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh';
const MAC_ARM64_INSTALLER_URL = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh';

async function downloadFile(url, filePath) {
  // const text = await fetch(url).then(res => res.text());
  // await fs.promises.writeFile(filePath, text);
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    onDownloadProgress: progressEvent => {
      console.log('progressEvent', progressEvent);
    }
  });
  const outputStream = fs.createWriteStream(filePath);
  let error;
  return new Promise((resolve, reject) => {
    outputStream.on('error', err => {
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

async function binaryPath(cmd) {
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

async function checkRequiredGDALBinaries() {
  const gdal = {};
  for (const bin of Object.values(GDAL_BINARIES)) {
    const installed = await binaryPath(bin);
    if (!installed) { return false }
    gdal[bin] = installed;
  }
  return gdal;
}

function getInstallDirectory() {
  return path.join(app.getPath('home'), 'CourseTerrainTool');
}

function getMinicondaDirectory() {
  return path.join(getInstallDirectory(), MINICONDA_DIR_NAME);
}

function getMiniCondaScriptPath() {
  return path.join(getInstallDirectory(), MINICONDA_ENV_NAME);
}

function getMiniCondaEnvironmentPath() {
  return path.join(
    getMinicondaDirectory(),
    process.platform === 'win32' ? 'Scripts/conda.exe' : 'bin/conda'
  );
}


export async function verifyDependencies() {

  // const isCondaInstalled = await binaryExists('conda');
  // const isPDALInstalled = await binaryExists('pdal');
  // const isGDALInstalled = await checkRequiredGDALBinaries();
  // const isGDALInstalled = await binaryExists('babbbb');

  // see what's installed natively
  tools = {
    platform: process.platform,
    arch: process.arch,
    conda: null,
    pdal: null,
    gdal: null
  };

  const conda = await binaryPath('conda');
  if (conda) {
    tools.conda = conda;
  }
  const pdal = await binaryPath('pdal');
  if (pdal) {
    tools.pdal = pdal;
  }
  const gdal = await checkRequiredGDALBinaries();
  if (gdal) {
    tools.gdal = gdal;
  }

  if (!tools.conda) {
    // see if we've installed in our home directory
    const installDir = getInstallDirectory();
    const condaScriptPath = getMiniCondaScriptPath();
    console.log('condaScriptPath', condaScriptPath);
    if(fs.existsSync(condaScriptPath)) {
      console.log('exists!');
      tools.conda = condaScriptPath;
    }
  }
  if (!tools.pdal && tools.conda) {
    // check conda for PDAL
    tools.pdal = await verifyCondaPackage('pdal');
    tools.gdal = await verifyCondaPackage('gdal');
  }

  tools.passed = tools.pdal && tools.gdal ? true : false;
  // console.log('dependency-check', tools);
  console.log('appData', tools);

  return tools;
  // const pdalVersion = await execAsync(`pdal --version`);
  // console.log(pdalVersion);

  // const gdalVersion = await execAsync(`gdalinfo --version`);
  // console.log(gdalVersion);
}

export async function installDependencies(sender) {
  if (!tools) {
    await verifyDependencies();
  }
  if (tools.passed) {
    console.log('Nothing to install');
    return sender.send('install-error', 'Nothing to install');
  }

  const installDir = getInstallDirectory();
  mkdirSafe(installDir);

  if (!tools.conda) {
    sender.send('install-progress', { text: 'Installing miniconda package manager', percent: (1 / 3) * 100 });
    if (process.platform === 'darwin') {
      await installCondaMac(installDir);
    } else if (process.platform === 'win32') {
      await installCondaWindows(installDir);
    } else {
      const error = `Unsupported platform ${process.platform}`;
      sender.send('install-error', error);
      throw new Error(error);
    }
    await verifyDependencies();

    if (!tools.conda) {
      sender.send('install-error', 'Unable to verify conda installation');
      throw new Error('Unable to verify conda installation');
    }
  } else {
    console.log(`Conda already installed at: ${tools.conda}`);
  }

  // do we need this?
  // await runCommand('conda', ['init']);
  
  const installList = [!tools.gdal && 'gdal', !tools.pdal && 'pdal'].filter(Boolean);
  // const installList = ['pdal', 'gdal'];
  if (!installList.length) {
    console.log('Nothing to install');
    sender.send('install-error', 'Nothing to install');
    return;
  }
  sender.send('install-progress', { text: `Installing required packages (${installList.length})`, percent: (2 / 3) * 100 });


  const condaEnvDir = getMiniCondaEnvironmentPath();

  // install 
  // conda create --yes --name cttenv --channel conda-forge installList.join(' ');
  if (!fs.existsSync(condaEnvDir)) {
    await runCommand(tools.conda, [
      'create',
      '--yes',
      // '--name', 'cttenv',
      '--prefix', condaEnvDir,
      // '--dry-run',
      '--channel', 'conda-forge',
      ...installList
    ]);
  }

  sender.send('install-progress', { text: `Verifying package installation`, percent: (2.5 / 3) * 100 });

  await verifyDependencies();
  if (tools.gdal && tools.pdal) {
    sender.send('install-progress', { text: `Finishing up`, percent: 100 });
  }
  sender.send('install-finish', { tools });

  // await runCommand(tools.conda, [
  //   'run', '-p', condaEnvDir, 'pdal', '--version'
  // ]);
}

let cachedPackages;
async function verifyCondaPackage(packageName) {
  const condaEnvDir = getMiniCondaEnvironmentPath();
  // only run this fetch once
  if (!fs.existsSync(condaEnvDir)) {
    console.log('Conda environment not setup.');
    return;
  }
  if (!cachedPackages) {
    // const condaEnvDir = path.join(getInstallDirectory(), 'ctt-env');
    const condaEnvDir = getMiniCondaEnvironmentPath();
    const res = await execAsync(`${tools.conda} list -p "${condaEnvDir}" --json`);
    cachedPackages = JSON.parse(res.stdout);
  }
  const packageInList = cachedPackages.some(pkg => pkg.name === packageName);
  if (packageInList) {
    return { type: 'conda', key: packageName };
  }
}

async function downloadCondaInstaller(url, localSetupFile) {
  // clear out any previous installation of conda
  // QUESTION: should we remove all previously installed binaries in this case too?
  if (!fs.existsSync(localSetupFile)) {
    // await fs.promises.unlink(localSetupFile);
    await downloadFile(url, localSetupFile);
  }
}

function runCommand(bin, options, shell) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, options, shell ? { shell } : undefined);
    child.stderr.on('data', data => console.log(`[${path.basename(bin)}]: ${data}`));
    child.stdout.on('data', data => console.log(`[${path.basename(bin)}]: ${data}`));
    child.on('close', code => {
      console.log(`exited: ${code}`);
      if (code !== 0) {
        return reject();
      }
      resolve();
    });  
  });
}

export async function installCondaMac(appDir) {
  // download https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
  // bash ~/miniconda.sh -b -p $HOME/miniconda
  let bashUrl = MAC_INSTALLER_URL;
  if (process.arch === 'amd64') {
    bashUrl = MAC_ARM64_INSTALLER_URL;
  }
  const localInstallerPath = path.join(appDir, 'setup_miniconda.sh');
  await downloadCondaInstaller(bashUrl, localInstallerPath);
  console.log(`Downloaded ${bashUrl}\n-> ${localInstallerPath}`);

  const condaInstallDir = getMinicondaDirectory();

  // ensure the directory exists
  mkdirSafe(condaInstallDir);

  /**
   * 
   * -b           batch mode (no manual intervention)
   * -u           update an existing installation
   * -p PREFIX    install prefix, defaults to $PREFIX, must not contain spaces. 
   * -m           disable the creation of menu items / shortcuts
  */
 // install minicon in silent mode via bash
  await runCommand('bash', [
    localInstallerPath,
    '-b', '-u', '-m',
    '-p', condaInstallDir
  ]);
  // clean up
  await fs.promises.unlink(localInstallerPath);
}
  
  export async function installCondaWindows(appDir) {
    // (Source: https://docs.anaconda.com/miniconda/install/)
    const localInstallerPath = path.join(appDir, 'setup_miniconda.exe');
    await downloadCondaInstaller(WIN_INSTALLER_URL, localInstallerPath);

    console.log(`Downloaded ${WIN_INSTALLER_URL}\n-> ${localInstallerPath}`);

    const condaInstallDir = getMinicondaDirectory();
  
    // ensure the directory exists
    mkdirSafe(condaInstallDir);

    // install minicon via powershell
    await runCommand('Start-Process', [
      '-FilePath', localInstallerPath,
      '-ArgumentList', `@("/S", "/D=${condaInstallDir}")`,
      '-Wait'
    ], 'powershell.exe');
    
    // clean up
    await fs.promises.unlink(localInstallerPath);

  }