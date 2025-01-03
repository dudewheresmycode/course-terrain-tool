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
    const customCondaPath = path.join(installDir, 'miniconda/bin/conda');
    if(fs.existsSync(customCondaPath)) {
      tools.conda = customCondaPath;
    }
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

export async function installDependencies() {
  if (!tools) {
    await verifyDependencies();
    if (tools.passed) {
      return;
    }
  }

  const installDir = getInstallDirectory();
  mkdirSafe(installDir);

  if (!tools.conda) {
    if (process.platform === 'darwin') {
      await installCondaMac(installDir);
    } else if (process.platform === 'win32') {
      await installCondaWindows(installDir);
    } else {
      throw new Error(`Unsupported platform ${process.platform}`);
    }
  } else {
    console.log(`Conda already installed at: ${tools.conda}`);
  }

  // do we need this?
  // await runCommand('conda', ['init']);
  
  // const installList = [!!tools.gdal && 'gdal', !!tools.pdal && pdal].filter(Boolean);
  const installList = ['pdal', 'gdal'];
  if (!installList.length) {
    console.log('Nothing to install');
    return;
  }
  const condaEnvDir = path.join(installDir, 'ctt-env');
  // mkdirSafe(condaEnvDir)

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

  await runCommand(tools.conda, [
    'run', '-p', condaEnvDir, 'pdal', '--version'
  ]);
}

async function downloadCondaInstaller(url, localSetupFile) {
  // clear out any previous installation of conda
  // QUESTION: should we remove all previously installed binaries in this case too?
  if (!fs.existsSync(localSetupFile)) {
    // await fs.promises.unlink(localSetupFile);
    await downloadFile(url, localSetupFile);
  }
}

function runCommand(bin, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, options);
    child.stderr.on('data', data => console.log(`[miniconda]: ${data}`));
    child.stdout.on('data', data => console.log(`[miniconda]: ${data}`));
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

  // const res = await execAsync(`bash "${localBashFile}" -b -u -m -p "${appDir}"`);
  // const baseInstallDir = path.join(app.getPath('home'), 'CourseTerrainTools');
  // mkdirSafe(tempDir)

  const condaTempDir = path.join(appDir, 'miniconda');
  mkdirSafe(condaTempDir)

  console.log('condaTempDir', condaTempDir);
  /**
   * 
   * -b           batch mode (no manual intervention)
   * -u           update an existing installation
   * -p PREFIX    install prefix, defaults to $PREFIX, must not contain spaces. 
   * -m           disable the creation of menu items / shortcuts
  */
  await runCommand('bash', [
    localInstallerPath,
    '-b', '-u', '-m',
    '-p', condaTempDir
  ]);

  // TODO: install PDAL/GDAL
  // TODO: remove installer

  // const res = await execAsync(`bash "${localInstallerPath}" -h`, { shell: 'bash' });
  // console.log(res);

  // const child = spawn('bash', [
  //   bashFilePath
  // ]);
  // child.stderr.on('data', data => console.log(`stderr: ${data}`));
  // child.stdout.on('data', data => console.log(`stdout: ${data}`));
  // child.on('close', code => console.log(`exited with code: ${code}`));
}
  
  export async function installCondaWindows(appDir) {
    // curl https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe -o miniconda.exe
    // (Source: https://docs.anaconda.com/miniconda/install/)
    // pwsh
    const localInstallerPath = path.join(appDir, 'setup_miniconda.exe');
    await downloadCondaInstaller(WIN_INSTALLER_URL, localInstallerPath);
    console.log(`Downloaded ${WIN_INSTALLER_URL}\n-> ${localInstallerPath}`);

    // const res = await execAsync('install', {'shell':'powershell.exe'});
  // const child = spawn('pwsh.exe', [
  //   bashFilePath
  // ]);

  }