
/**
  * transform x or y tile number to pixel on image canvas
  */
export function xyToPx(xy, centerXY) {
  const px = ((xy - centerXY) * tileSize) + (imageSize / 2);
  return Number(Math.round(px));
}

export function lonToX(lon, zoom) {
  return ((lon + 180) / 360) * (2 ** zoom);
}

export function latToY(lat, zoom) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1
  / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (2 ** zoom);
}

export function yToLat(y, zoom) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (2 ** zoom))))
    / Math.PI * 180;
}

export function xToLon(x, zoom) {
  return x / (2 ** zoom) * 360 - 180;
}

// export function meterToPixel(meter, zoom, lat) {
//   const latitudeRadians = lat * (Math.PI / 180);
//   const meterProPixel = (156543.03392 * Math.cos(latitudeRadians)) / 2 ** zoom;
//   return meter / meterProPixel;
// }

export function tileXYToQuadKey(x, y, z) {
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
