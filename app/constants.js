export const CTT_DIR_NAME = 'CourseTerrainTool';

export const MF_DIR_NAME = 'miniforge';
export const CONDA_ENV_NAME = 'ctt_conda';

const MINIFORGE_BASE_URL =
  'https://github.com/conda-forge/miniforge/releases/download/24.11.0-0';
export const MINIFORGE_MAC_X86 = `${MINIFORGE_BASE_URL}/Miniforge3-MacOSX-x86_64.sh`;
export const MINIFORGE_MAC_ARM = `${MINIFORGE_BASE_URL}/Miniforge3-MacOSX-arm64.sh`;
export const MINIFORGE_WIN = `${MINIFORGE_BASE_URL}/Miniforge3-Windows-x86_64.exe`;

export const GDAL_BINARIES = {
  gdal_translate: 'gdal_translate',
  gdal_fillnodata: 'gdal_fillnodata',
  gdalinfo: 'gdalinfo',
  gdaldem: 'gdaldem',
  gdalsrsinfo: 'gdalsrsinfo',
  projinfo: 'projinfo',
  ogr2ogr: 'ogr2ogr',
  gdalwarp: 'gdalwarp',
};

export const OGSApiEndpoint = process.env.OGS_API_URL || 'https://api.opengolfsim.com';


export const SatelliteSources = {
  Google: 'google',
  Bing: 'bing'
};