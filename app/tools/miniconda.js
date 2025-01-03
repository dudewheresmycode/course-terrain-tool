import fs from "fs";
import path from "path";

import {
  runCommand,
  getMiniCondaEnvironmentPath,
  downloadFile,
  execAsync,
  getInstallDirectory,
  getMinicondaDirectory,
} from "./utils.js";
import {
  MC_WIN_INSTALLER_URL,
  MC_MAC_INSTALLER_URL,
  MC_MAC_ARM64_INSTALLER_URL,
} from "../constants.js";
import mkdirSafe from "../utils/mkdirSafe.js";

let cachedPackages;

export async function downloadCondaInstaller(url, localSetupFile) {
  if (!fs.existsSync(localSetupFile)) {
    // QUESTION: should we remove any previously downloaded files in this case?
    // await fs.promises.unlink(localSetupFile);
    await downloadFile(url, localSetupFile);
  }
}

export async function installCondaMac() {
  // download https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
  // bash ~/miniconda.sh -b -p $HOME/miniconda
  let bashUrl = MC_MAC_INSTALLER_URL;
  if (process.arch === "amd64") {
    bashUrl = MC_MAC_ARM64_INSTALLER_URL;
  }
  const localInstallerPath = path.join(
    getInstallDirectory(),
    "setup_miniconda.sh"
  );
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
  await runCommand("bash", [
    localInstallerPath,
    "-b",
    "-u",
    "-m",
    "-p",
    condaInstallDir,
  ]);
  // clean up
  // await fs.promises.unlink(localInstallerPath);
  // await runCommand(conda ['clean', '-all']);
}

export async function installCondaWindows() {
  // (Source: https://docs.anaconda.com/miniconda/install/)
  const localInstallerPath = path.join(
    getInstallDirectory(),
    "setup_miniconda.exe"
  );
  await downloadCondaInstaller(MC_WIN_INSTALLER_URL, localInstallerPath);

  console.log(`Downloaded ${MC_WIN_INSTALLER_URL}\n-> ${localInstallerPath}`);

  const condaInstallDir = getMinicondaDirectory();

  // ensure the directory exists
  mkdirSafe(condaInstallDir);

  // install minicon via powershell
  await runCommand(
    "Start-Process",
    [
      "-FilePath",
      localInstallerPath,
      "-ArgumentList",
      `@("/S", "/D=${condaInstallDir}")`,
      "-Wait",
    ],
    "powershell.exe"
  );

  // clean up
  // await fs.promises.unlink(localInstallerPath);
}

export async function installToolsWithConda(condaBin, installList) {
  const condaEnvDir = getMiniCondaEnvironmentPath();
  if (fs.existsSync(condaEnvDir)) {
    return;
  }
  await runCommand(condaBin, [
    "create",
    "--yes",
    "--prefix",
    condaEnvDir,
    // useful for testing
    // '--dry-run',
    "--channel",
    "conda-forge",
    ...installList,
  ]);
}

export async function verifyCondaPackage(condaBin, packageName) {
  const condaEnvDir = getMiniCondaEnvironmentPath();
  // only run this fetch once
  if (!fs.existsSync(condaEnvDir)) {
    console.log("Conda environment not setup.");
    return;
  }
  if (!cachedPackages) {
    // const condaEnvDir = path.join(getInstallDirectory(), 'ctt-env');
    const condaEnvDir = getMiniCondaEnvironmentPath();
    const res = await execAsync(`${condaBin} list -p "${condaEnvDir}" --json`);
    cachedPackages = JSON.parse(res.stdout);
  }
  const packageInList = cachedPackages.some((pkg) => pkg.name === packageName);
  if (packageInList) {
    return { type: "conda", key: packageName };
  }
}
