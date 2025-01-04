import fs from 'node:fs';

import { GDAL_BINARIES } from '../constants.js';
import { findBinaryPath } from './utils.js';
import { checkBrewSupport } from './homebrew.js';
import { getCondaEnvironmentPath, getCondaScriptPath, verifyCondaPackage } from './miniforge.js';

export const tools = {
  platform: process.platform,
  arch: process.arch,
  homebrew: undefined,
  conda: undefined,
  pdal: undefined,
  gdal: undefined,
};

export async function verifyDependencies() {

  tools.conda = await findBinaryPath('conda');
  tools.homebrew = await checkBrewSupport();

  // const pdal = await findBinaryPath('pdal');
  // if (pdal) {
  //   tools.pdal = { type: 'bin', bin: pdal };
  // }
  // const gdal = await checkRequiredGDALBinaries();
  // if (gdal) {
  //   tools.gdal = { type: 'bin', bin: gdal };
  // }

  if (!tools.conda) {
    // check if we've already installed conda to our isolated env
    const condaBin = getCondaScriptPath();
    if (fs.existsSync(condaBin)) {
      tools.conda = condaBin;
    }
  }
  // check if we've already installed conda to our isolated env
  if ((!tools.pdal || !tools.gdal) && tools.conda) {
    // check conda for PDAL
    const pdalPackage = await verifyCondaPackage(tools.conda, 'pdal');
    tools.pdal = { type: 'conda', bin: pdalPackage }
    const gdalPackage = await verifyCondaPackage(tools.conda, 'gdal');
    tools.gdal = { type: 'conda', bin: { ...GDAL_BINARIES } };
  }

  tools.passed = tools.pdal && tools.gdal ? true : false;

  if (tools.passed && tools.conda) {
    tools.condaEnv = getCondaEnvironmentPath();
  }
  return tools;
}
