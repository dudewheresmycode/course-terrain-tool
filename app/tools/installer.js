import fs from 'node:fs';

import { GDAL_BINARIES } from '../constants.js';
import mkdirSafe from '../utils/mkdirSafe.js';
import {
  getInstallDirectory,
  getMiniCondaScriptPath,
  findBinaryPath,
} from './utils.js';
import { checkBrewSupport, installToolsWithBrew } from './homebrew.js';
import {
  // installToolsWithConda,
  // verifyCondaPackage,
  installCondaMac,
  installCondaWindows,
} from './miniconda.js';
import { installMiniforge, getCondaScriptPath, installToolsWithConda, verifyCondaPackage } from './miniforge.js';

const tools = {
  platform: process.platform,
  arch: process.arch,
  homebrew: undefined,
  conda: undefined,
  pdal: undefined,
  gdal: undefined,
};

async function checkRequiredGDALBinaries() {
  const gdal = {};
  for (const bin of Object.values(GDAL_BINARIES)) {
    const installed = await findBinaryPath(bin);
    if (!installed) {
      return false;
    }
    gdal[bin] = installed;
  }
  return gdal;
}

export async function verifyDependencies() {
  tools.conda = await findBinaryPath('conda');
  tools.homebrew = await checkBrewSupport();

  // const pdal = await findBinaryPath('pdal');
  // if (pdal) {
  //   tools.pdal = pdal;
  // }
  // const gdal = await checkRequiredGDALBinaries();
  // if (gdal) {
  //   tools.gdal = gdal;
  // }

  if (!tools.conda) {
    // see if we've installed in our home directory
    // const condaScriptPath = getMiniCondaScriptPath();
    // if (fs.existsSync(condaScriptPath)) {
    //   tools.conda = condaScriptPath;
    // }
    // check if we've already installed conda to our isolated env
    const condaBin = getCondaScriptPath();
    if (fs.existsSync(condaBin)) {
      tools.conda = condaBin;
    }
  }
  // check if we've already installed conda to our isolated env
  if ((!tools.pdal || !tools.gdal) && tools.conda) {
    // check conda for PDAL
    tools.pdal = await verifyCondaPackage(tools.conda, 'pdal');
    tools.gdal = await verifyCondaPackage(tools.conda, 'gdal');
  }

  tools.passed = tools.pdal && tools.gdal ? true : false;
  return tools;
}

function handleError(sender, error) {
  sender.send('install-error', error);
  throw new Error(error);
}

export async function installDependencies(sender) {
  if (!tools) {
    await verifyDependencies();
  }
  if (tools.passed) {
    handleError(sender, 'All dependencies have been met. Try restarting the app.');
  }

  const installList = [!tools.gdal && 'gdal', !tools.pdal && 'pdal'].filter(
    Boolean
  );
  if (!installList.length) {
    handleError(sender, 'All dependencies have been met. Try restarting the app.');
  }

  const installDir = getInstallDirectory();
  mkdirSafe(installDir);

  if (process.platform === 'darwin') {
    // Disable homebrew install for now
    // if (tools.homebrew) {
    //   console.log(
    //     'Detected homebrew support, install with homebrew?',
    //     installList
    //   );
    //   sender.send('install-progress', {
    //     text: 'Installing packages with homebrew',
    //   });
    //   await installToolsWithBrew(installList);
    //   return finishInstall(sender);
    // }
  }

  // } else if (process.platform === 'win32') {
  //   // Windows Setup
  //   if (!tools.conda) {
  //     // if conda is not installed, we'll install that first
  //     sender.send('install-progress', {
  //       text: 'Installing miniconda package manager',
  //     });
  //     // await installCondaWindows(tools.conda, installDir);
  //   }

  //   sender.send('install-progress', {
  //     text: `Installing packages with conda (${installList.join(', ')})`,
  //   });
  //   await installToolsWithConda(tools.conda, installList);
  // } else {
  //   // We currently only support Windows and Mac
  //   const error = `Unsupported platform ${process.platform}`;
  //   sender.send('install-error', error);
  //   throw new Error(error);
  // }


  // fallback to conda
  if (!tools.conda) {
    sender.send('install-progress', {
      text: 'Installing miniforge package manager',
    });
    tools.conda = await installMiniforge(installDir);
    if (!tools.conda) {
      handleError(sender, 'Something went wrong during installation');
    }
    console.log(`Installed: ${tools.conda}`);
    sender.send('install-progress', {
      text: 'Miniforge installation completed',
    });
    // sender.send('install-progress', {
    //   text: 'Installing miniconda package manager',
    // });
    // await installCondaMac(installDir);
  }

  sender.send('install-progress', {
    text: `Installing packages with conda (${installList.join(', ')})`,
  });
  await installToolsWithConda(tools.conda, installList);

  await finishInstall(sender);
}

async function finishInstall(sender) {
  sender.send('install-progress', { text: 'Verifying installation of tools' });
  await verifyDependencies();

  if (tools.gdal && tools.pdal) {
    sender.send('install-finish', { tools });
    return;
  }
  sender.send('install-error', {
    error:
      'Something went wrong during the installation. Consider filing an issue.',
  });
}
