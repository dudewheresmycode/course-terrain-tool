
const MC_BASE_URL = 'https://repo.anaconda.com/miniconda';

export const CTT_DIR_NAME = 'CourseTerrainTool';

export const MC_DIR_NAME = 'miniconda';
export const MC_ENV_NAME = 'ctt_env';

export const MC_WIN_INSTALLER_URL = `${MC_BASE_URL}/Miniconda3-latest-Windows-x86_64.exe`;
export const MC_MAC_INSTALLER_URL = `${MC_BASE_URL}/Miniconda3-latest-MacOSX-x86_64.sh`;
export const MC_MAC_ARM64_INSTALLER_URL = `${MC_BASE_URL}/Miniconda3-latest-MacOSX-arm64.sh`;

export const GDAL_BINARIES = {
  gdal_translate: 'gdal_translate',
  gdal_fillnodata: 'gdal_fillnodata',
  gdalinfo: 'gdalinfo',
  gdaldem: 'gdaldem'
};