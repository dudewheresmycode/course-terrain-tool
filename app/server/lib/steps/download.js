import fs from 'fs';
import pMap from 'p-map';
import path from 'path';
import axios from 'axios';

async function fetchFileSize(source) {
  // since we stream to the local file, axios enables chunked transfer encoding removing the content-length from the header
  // so we do a quick head object to get total filesize first
  const res = await fetch(source.downloadURL, { method: 'HEAD' });
  const contentLength = res.headers.get('content-length');
  if (contentLength) {
    return { ...source, _size: parseInt(contentLength, 10) };
  }
  return source;
}

async function downloadSource(source, downloadDirectory, index, onProgress) {
  // console.log('download', source);
  const downloadUrl = new URL(source.downloadURL);
  const filePath = path.join(downloadDirectory, path.basename(downloadUrl.pathname));
  if (fs.existsSync(filePath)) {
    // TODO: add checksum etag/hash check to verify download
    return {
      ...source,
      _file: filePath
    };
  }
  console.log(`Downloading: ${source.downloadURL}`)
  const response = await axios({
    method: 'get',
    url: source.downloadURL,
    responseType: 'stream',
    onDownloadProgress: progressEvent => {
      // console.log('progressEvent', progressEvent);
      const total = progressEvent.total || source._size;
      if (total) {
        const current = progressEvent.loaded;
        let percent = Math.floor(current / total * 100);
        // console.log(`index: ${index}, bytes: ${progressEvent.bytes}, loaded:${progressEvent.loaded}, size:${source.sizeInBytes}, percent:${percent}`);
        onProgress(index, progressEvent.bytes, total, percent);
      }
    }
  });
  // console.log('response', response.headers);
  const outputStream = fs.createWriteStream(filePath);
  let error = null;
  // let bytesLoaded = 0;
  // const bytesTotal = response.headers['content-length'];
  // console.log(`bytesTotal: ${bytesTotal}`);
  return new Promise((resolve, reject) => {
    // response.data.on('data', (chunk) => {
    //   bytesLoaded += chunk.length;
    //   const percent = (bytesLoaded / bytesTotal) * 100;
    //   // console.log(`bytesLoaded: ${bytesLoaded}, bytesTotal: ${bytesTotal}`);
    //   // console.log(`(${index+1}/${total}): ${percent.toFixed(2)}`);
    //   onProgress(index, percent);
    // });
    outputStream.on('error', err => {
      error = err;
      reject(err);
      outputStream.close();
    });
    outputStream.on('close', () => {
      if (!error) {
        console.log('finished downloading file');
        resolve({
          ...source,
          _file: filePath
        });
      }
    });
    response.data.pipe(outputStream);
  });
}

export default async function downloadDataSources({
  sources,
  downloadDirectory,
  onDownloadProgress
}) {

  const withSizes = await pMap(sources, fetchFileSize, { concurrency: 4 });
  const totalBytesToDownload = withSizes.reduce((prev, source) => prev + source._size, 0);
  // const totalBytesToDownload = sources.reduce((prev, source) => prev + source.sizeInBytes, 0);
  let totalBytesDownloaded = 0;
  const onProgress = (index, bytesLoaded, bytesTotal, percent) => {
    totalBytesDownloaded += bytesLoaded;
    const totalProgress = ((totalBytesDownloaded / totalBytesToDownload) * 100);
    // console.log(`${index+1}/${sources.length}, total: ${totalProgress}, percent: ${percent}%`);
    if (typeof onDownloadProgress === 'function') {
      onDownloadProgress(totalProgress);
    }
  }
  return pMap(withSizes, (source, index) => downloadSource(source, downloadDirectory, index, onProgress), { concurrency: 4 });
}