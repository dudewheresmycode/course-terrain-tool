
export default function runCondaCommand(binary, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, options, shell ? { shell } : undefined);
    child.stderr.on('data', data => console.log(`[${path.basename(bin)}]: ${data}`));
    child.stdout.on('data', data => console.log(`[${path.basename(bin)}]: ${data}`));
    child.on('close', code => {
      console.log(`exited: ${code}`);
      if (code !== 0) {
        return reject();
      }
      resolve();
    });  
  });
}