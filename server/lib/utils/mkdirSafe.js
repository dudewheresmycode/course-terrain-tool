import fs from 'fs';

export default function mkdirSafe(dir) {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
}