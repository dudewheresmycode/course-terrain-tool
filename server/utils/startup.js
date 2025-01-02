import path from 'path';
import dotEnv from 'dotenv';

// parse any .env files that exist
dotEnv.config({
  path: [
    path.resolve(process.cwd(), 'default.env'),
    path.resolve(process.cwd(), '../default.env'),
  ]
});

// if (!process.env.TERRAIN_DIR) {
//   throw new Error('TERRAIN_DIR environment variable must be set. Please refer to the documentation. (https://github.com/dudewheresmycode/course-terrain-tool#set-environment-variable)');
// }