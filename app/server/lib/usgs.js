/**
 * https://tnmaccess.nationalmap.gov/api/v1/products?
 * polygon:
 *  -105.05397181957737, 40.53805472957177,
 *  -105.04330065101134 40.53805472957177,
 *  -105.04330065101134 40.53061647596421,
 *  -105.05397181957737 40.53061647596421,
 *  -105.05397181957737 40.53805472957177
 * datasets:
 * Original%20Product%20Resolution%20(OPR)%20Digital%20Elevation%20Model%20(DEM),Digital%20Elevation%20Model%20(DEM)%201%20meter,Ifsar%20Digital%20Surface%20Model%20(DSM),Ifsar%20Orthorectified%20Radar%20Image%20(ORI),Lidar%20Point%20Cloud%20(LPC)
 * 
 * Formats:
 * https://www.usgs.gov/3d-elevation-program/about-3dep-products-services
 * IfSAR digital surface model (DSM):  These 5 meter rasters, available only in Alaska
 * IfSAR orthorectified radar intensity image (ORI): These rasters (resolutions vary), available only in Alaska
 * 
 * Lidar point cloud: These data are the foundational data for 3DEP in the conterminous
 * 
 * Source resolution DEMs: These data are the original bare earth DEMs derived from the
 * lidar point cloud source. Source DEMs (also called "original product resolution" [OPR] DEMs)
 * processed by the USGS after January 2015 are provided where the original DEM horizontal
 * resolution or projection differ from the 3DEP standard DEM datasets.
 * 
*/
import log from 'electron-log';

const USGS_API = 'https://tnmaccess.nationalmap.gov/api/v1/products';

const USGS_ELEVATION_PRODUCTS = [
  // Workaround for a bug in the USGS National Map API
  // These first two products are sent concatenated with no comma
  // without sending it this way, we wont get any DEM models back
  'Original Product Resolution (OPR) Digital Elevation Model (DEM)',
  // we also send them split up, in case they fix this bug someday
  'Original Product Resolution (OPR)',
  'Digital Elevation Model (DEM)',
  'Ifsar Digital Surface Model (DSM)',
  'Ifsar Orthorectified Radar Image (ORI)',
  'Lidar Point Cloud (LPC)'
];

async function fetchAll(polygon, offset = 0) {
  // TODO: Implement pagination?
  // For now we just set a max of 100 and hope we don't need more than that to cover a course area
  let urlSearchParams = `max=100&polygon=${encodeURIComponent(polygon)}&datasets=${encodeURIComponent(USGS_ELEVATION_PRODUCTS.join(','))}`;
  // if (offset) {
  //   urlSearchParams += `&offset=${offset}`;
  // }
  const fetchUrl = `${USGS_API}?${urlSearchParams}`;
  try {
    const res = await fetch(fetchUrl);
    const data = await res.json();
    log.info(`[usgs] Fetched ${data.length} results`);
    // if (data.total > data.items.length) {
    //   offset = data.items.length;
    //   return [...data.items, (await fetchAll(polygon, offset))]
    // }
    return data.items;
  } catch (error) {
    log.error('[usgs] Error', error);
    throw error;
  }
}

function getProjectGroup(title) {
  if (!title) { return ''; }
  const cwords = title.split(' ');
  const _tileId = cwords.pop();
  return cwords.join(' ');
}

export default async function search(polygon) {
  const allItems = await fetchAll(polygon);
  const groupedByType = allItems.reduce((groups, item) => {
    const itemGroup = getProjectGroup(item.title);
    const existingGroup = groups.find(group => group.format === item.format && group.group === itemGroup);
    if (!existingGroup) {
      groups.push({ items: [item], source: 'USGS', format: item.format, publicationDate: item.publicationDate, group: itemGroup });
    } else {
      existingGroup.items.push(item);
    }
    return groups;
  }, []);
  return groupedByType;
}