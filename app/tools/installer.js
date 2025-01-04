import { GDAL_BINARIES } from '../constants.js';
import mkdirSafe from '../utils/mkdirSafe.js';
import { getInstallDirectory, findBinaryPath } from './utils.js';
import { installMiniforge, installToolsWithConda } from './miniforge.js';
import { tools, verifyDependencies } from './index.js';


function handleError(sender, error) {
  sender.send('install-error', error);
  throw new Error(error);
}

export async function installDependencies(sender) {
  try {
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

    // if (process.platform === 'darwin') {
    //   // Disable homebrew install for now
    //   if (tools.homebrew) {
    //     // TODO: alert the user and confirm before proceeding
    //     console.log(
    //       'Detected homebrew support, install with homebrew?',
    //       installList
    //     );
    //     sender.send('install-progress', {
    //       text: 'Installing packages with homebrew',
    //     });
    //     await installToolsWithBrew(installList);
    //     return finishInstall(sender);
    //   }
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
    }

    sender.send('install-progress', {
      text: `Installing packages with conda (${installList.join(', ')})`,
    });
    await installToolsWithConda(tools.conda, installList);

    await finishInstall(sender);

  } catch (error) {
    handleError(sender, error);
  }
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
