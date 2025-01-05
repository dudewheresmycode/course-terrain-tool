import fs from 'node:fs';

import BaseTask from './base.js';
import mkdirSafe from '../utils/mkdirSafe.js';

export class CreateDirectoryTask extends BaseTask {
  constructor({ directory, id }) {
    super();
    this.id = id || 'directory';
    this.directory = directory;
  }

  process() {
    if (fs.existsSync(this.directory)) {
      throw new Error(`Directory already exists! ${this.directory}`);
    }
    mkdirSafe(this.directory);
  }

  cancel() {
    // noop
  }
}
