import fs from 'fs';
import pMap from 'p-map';
import path from 'path';
import axios from 'axios';

import BaseTask from './base.js';

// utils

async function fetchFileSize(source) {
  if (source._file && fs.existsSync(source._file)) {
    return source;
  }
  // since we stream to the local file, axios enables chunked transfer encoding removing the content-length from the header
  // so we do a quick head object to get total filesize first
  const res = await fetch(source.downloadURL, { method: 'HEAD' });
  const contentLength = res.headers.get('content-length');
  if (contentLength) {
    return { ...source, _size: parseInt(contentLength, 10) };
  }
  return source;
}

export class DownloadTask extends BaseTask {
  constructor({
    downloadDirectory
  }) {
    super();
    this.id = 'download';
    this.label = 'Initializing download';
    this.downloadDirectory = downloadDirectory;
  }

  async downloadSource(source, totalItems) {
    if (source._file && fs.existsSync(source._file)) {
      return source;
    }
    console.log('download source', source);
    const downloadUrl = new URL(source.downloadURL);
    const filePath = path.join(this.downloadDirectory, path.basename(downloadUrl.pathname));
    if (fs.existsSync(filePath)) {
      // TODO: add checksum etag/hash check to verify download?
      return {
        ...source,
        _file: filePath
      };
    }
    let lastLoaded = 0;
    const response = await axios({
      method: 'get',
      signal: this.abortController.signal,
      url: source.downloadURL,
      responseType: 'stream',
      onDownloadProgress: progressEvent => {
        if (progressEvent.loaded) {
          this.totalBytesDownloaded += (progressEvent.loaded - lastLoaded);
          lastLoaded = progressEvent.loaded;
          const percent = ((this.totalBytesDownloaded / this.totalBytesToDownload) * 100);
          const label = `Downloading ${totalItems} lidar data files (${percent.toFixed(1)}%)`;
          console.log(`this.totalBytesDownloaded: ${this.totalBytesDownloaded}, ${this.totalBytesToDownload}`);
          this.emit('progress', label, percent);
        }
      }
    });
    const outputStream = fs.createWriteStream(filePath);
    let error = null;
    return new Promise((resolve, reject) => {
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

  async process(data) {
    // we perform a HEAD object on all items to get a total file size
    const sourcesWithSize = await pMap(data.dataSource.items, fetchFileSize, { concurrency: 4, signal: this.abortController.signal });
    this.totalBytesToDownload = sourcesWithSize.reduce((prev, source) => prev + source._size, 0);
    this.totalBytesDownloaded = 0;

    data._outputFiles.downloads = await pMap(sourcesWithSize, source => this.downloadSource.call(this, source, data.dataSource.items.length), { concurrency: 3, signal: this.abortController.signal });
  }

}