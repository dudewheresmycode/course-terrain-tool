import fs from 'node:fs';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import proc from 'node:process';
import { app } from 'electron';

const execAsync = promisify(exec);

const MAC_INSTALLER_URL = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh';
// const MAC_ARM64_INSTALLER_URL = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh';

async function downloadFile(url, filePath) {
  const response = await axios({
    method: 'get',
    url: source.downloadURL,
    responseType: 'stream'
  });
  const outputStream = fs.createWriteStream(filePath);
  let error;
  return new Promise(resolve => {
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

export async function verifyDependencies() {

  console.log(process.platform);
  console.log(process.arch);

  // const pdalVersion = await execAsync(`pdal --version`);
  // console.log(pdalVersion);

  // const gdalVersion = await execAsync(`gdalinfo --version`);
  // console.log(gdalVersion);
}

export async function installMac() {
  // download https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
  // bash ~/miniconda.sh -b -p $HOME/miniconda
  const bashFilePath = app.getPath("temp");
  console.log(`Download ${MAC_INSTALLER_URL}\n-> ${bashFilePath}`);
  // await downloadFile(MAC_INSTALLER_URL, bashFilePath);
  // const child = spawn('bash', [
  //   bashFilePath
  // ]);
  // child.stderr.on('data', data => console.log(`stderr: ${data}`));
  // child.stdout.on('data', data => console.log(`stdout: ${data}`));
  // child.on('close', code => console.log(`exited with code: ${code}`));
}
  
  export async function installWindows() {
    // pwsh
  // const child = spawn('pwsh.exe', [
  //   bashFilePath
  // ]);

  }