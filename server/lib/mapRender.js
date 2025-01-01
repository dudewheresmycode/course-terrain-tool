import path from 'path';
import pMap from 'p-map';
import sharp from 'sharp';
import StaticMaps from 'staticmaps';

const zoom = 20;
const tileSize = 256;
const imageSize = 4096;
const dataPath = path.resolve('./data');
console.log(dataPath);

const TileServers = {
  Google: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  Bing: 'http://ecn.t3.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1',
  // Bing: 'https://ecn.t3.tiles.virtualearth.net/tiles/{z}s/{y}s/{x}s',
  // Mapbox: 'http://www.example.com/tiles/{z}/{x}/{y}{ratio}.png'
} 

/**
  * transform x or y tile number to pixel on image canvas
  */
function xyToPx(xy, centerXY) {
  const px = ((xy - centerXY) * tileSize) + (imageSize / 2);
  return Number(Math.round(px));
}

function lonToX(lon, zoom) {
  return ((lon + 180) / 360) * (2 ** zoom);
}
function latToY(lat, zoom) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1
  / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (2 ** zoom);
}
function yToLat(y, zoom) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (2 ** zoom))))
    / Math.PI * 180;
}
function xToLon(x, zoom) {
  return x / (2 ** zoom) * 360 - 180;
}
function meterToPixel(meter, zoom, lat) {
  const latitudeRadians = lat * (Math.PI / 180);
  const meterProPixel = (156543.03392 * Math.cos(latitudeRadians)) / 2 ** zoom;
  return meter / meterProPixel;
}
function tileXYToQuadKey(x, y, z) {
  const quadKey = [];
  for (let i = z; i > 0; i--) {
    let digit = '0';
    const mask = 1 << (i - 1);
    if ((x & mask) !== 0) digit++;
    if ((y & mask) !== 0) {
      digit++;
      digit++;
    }
    quadKey.push(digit);
  }
  return quadKey.join('');
}

function replaceUrlMacros(str, tileX, tileY, zoom) {
  const quadkey = tileXYToQuadKey(tileX, tileY, zoom);
  return str
    .replace('{q}', quadkey)
    .replace('{x}', tileX)
    .replace('{y}', tileY)
    .replace('{z}', zoom);
}

async function fetchTile(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);  
  return buffer;
}

export default async function generateMap(polygon, center) {
  const [lon, lat] = center;
  
  console.log(`lon:${lon}, lat:${lat}`);
  const centerX = lonToX(center[0], zoom);
  const centerY = latToY(center[1], zoom);
  console.log(centerX, centerY);

  const topLeftTileYActual = latToY(polygon[0][1], zoom);
  const topLeftTileY = Math.floor(topLeftTileYActual);
  const topLeftTileXActual = lonToX(polygon[0][0], zoom);
  const topLeftTileX = Math.floor(topLeftTileXActual);

  const bottomRightTileYActual = latToY(polygon[2][1], zoom);
  const bottomRightTileY = Math.ceil(bottomRightTileYActual);
  const bottomRightTileXActual = lonToX(polygon[2][0], zoom);
  const bottomRightTileX = Math.ceil(bottomRightTileXActual);

  console.log('x', topLeftTileX, bottomRightTileX, (bottomRightTileX-topLeftTileX));
  console.log('y', topLeftTileY, (bottomRightTileY-topLeftTileY));
  // const tileUrl = replaceUrlMacros(TileServers.Google, topLeftTileX, topLeftTileY, zoom);
  // console.log(tileUrl);

  // const bingUrl = replaceUrlMacros(TileServers.Bing, topLeftTileX, topLeftTileY, zoom)
  // console.log(bingUrl);
  const tileUrls = [];
  const fullTileWidth = (bottomRightTileX - topLeftTileX) * tileSize;
  const fullTileHeight = (bottomRightTileY - topLeftTileY) * tileSize;

  const croppedTileWidth = Math.round((bottomRightTileXActual - topLeftTileXActual) * tileSize);
  const croppedTileHeight = Math.round((bottomRightTileYActual - topLeftTileYActual) * tileSize);

  const cropY = Math.round((topLeftTileYActual - topLeftTileY) * tileSize);
  const cropX = Math.round((topLeftTileXActual - topLeftTileX) * tileSize);
  const tileScale = imageSize / croppedTileWidth;
  console.log(`tileScale: ${tileScale}`);
  console.log(`fullTileWidth: ${fullTileWidth}x${fullTileHeight}`);
  console.log(`croppedTileWidth: ${croppedTileWidth}x${croppedTileHeight}`);
  console.log(`cropX: ${cropX}px, cropY: ${cropY}px`);
  
  for (let x = topLeftTileX; x <= bottomRightTileX; x++) {
    for (let y = topLeftTileY; y <= bottomRightTileY; y++) {
      const tileUrl = replaceUrlMacros(TileServers.Google, x, y, zoom);
      const xIndex = topLeftTileX - x;
      const yIndex = topLeftTileY - y;
      // console.log(xIndex);
      // console.log(yIndex);
      tileUrls.push({
        x,
        y,
        url: tileUrl,
        left: Math.round((((x - topLeftTileX) * tileSize) - cropX) * tileScale),
        top: Math.round((((y - topLeftTileY) * tileSize) - cropY) * tileScale),
        // box: [
        //   xyToPx(x, centerX),
        //   xyToPx(y, centerY),
        //   // xIndex * tileSize,
        //   // yIndex * tileSize,
        //   // (xIndex + 1) * tileSize,
        //   // (yIndex + 1) * tileSize,
        // ],        
      });
    }
  }
  console.log(`Received ${tileUrls.length} tiles, full res: ${fullTileWidth}x${fullTileHeight}`);
  const baseImage = sharp({
    create: {
      width: imageSize,
      height: imageSize,
      channels: 3,
      background: { r: 200, g: 200, b: 200 }
    }
  });

  const scaledTileSize = Math.round(tileSize * tileScale);

  let currentDownload = 0;
  const tileImages = await pMap(tileUrls, async (tile) => {
    const imageBuffer = await fetchTile(tile.url);
    const tileImage = await sharp(imageBuffer).resize({ width: scaledTileSize, height: scaledTileSize }).jpeg({ quality: 98 }).toBuffer();
    console.log(`Downloading ${currentDownload+1}/${tileUrls.length}`);
    currentDownload++;
    return {
      image: tileImage,
      ...tile
    }
    // await baseImage.composite({ input: imageBuffer, top: tile.top, left: tile.left })
  }, { concurrency: 10 });

  const outputImage = await baseImage
  .composite(
    tileImages.map(tile => {
      console.log(`Compositing ${currentDownload+1}/${tileUrls.length}`);
      return { input: tile.image, top: tile.top, left: tile.left }
    })
  )


  const outputFile = path.join(dataPath, 'Google_test_hq.jpg');
  await outputImage.jpeg({ quality: 98 }).toFile(outputFile);
  console.log(`Created: ${outputFile}`);
  // const options = {
  //   width: 2048,
  //   height: 2048,
  //   // tileSize: 256,
  //   // tileLayers: [
  //   //   {
  //   //     tileUrl: TileServers.Google,
  //   //   },
  //   //   // {
  //   //   //   tileUrl: 'http://www.openfiremap.de/hytiles/{z}/{x}/{y}.png',
  //   //   // }
  //   // ],
  //   // zoomRange: {
  //   //   max: 8, // NASA server does not support level 9 or higher
  //   // },
  //   // tileUrl: 'http://www.openfiremap.de/hytiles/{z}/{x}/{y}.png',
  //   tileUrl: TileServers.Google,
  // };
  // const map = new StaticMaps(options);  
  // // map.render();
  // // await map.render([13.437524, 52.4945528], 13);
  // console.log([
  //   polygon[0],
  //   polygon[2]
  // ]);
  // await map.render([polygon[0], polygon[2]]);
  // await map.image.save(path.join(dataPath, 'Google_002.jpg'));

  // coord : [13.437524,52.4945528]
}
