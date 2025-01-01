import path from 'path';
import express from 'express';
import expressWs from 'express-ws';
import dotEnv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotEnv.config();
  console.log(process.env);
}

import usgsSearch from './lib/usgs.js';
import mapRender from './lib/mapRender.js';
import { JobQueue } from './lib/jobs.js';

const PORT = process.env.PORT || 3133;

const app = express();

app.use(express.json());

const distPath = path.resolve('../client/dist');
console.log(distPath);

// if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  // app.get('/', express.static(path.join(process.cwd(), 'client/dist/index.html')));
  app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
// }

const expressWsInstace = expressWs(app);
const allWss = expressWsInstace.getWss('/progress');

function broadcast(data) {
  allWss.clients.forEach((client) => {
    client.send(JSON.stringify(data));
  });
}

const jobQueue = new JobQueue();

app.ws('/progress', (ws, req) => {
  ws.on('message', (msg) => {
    const message = JSON.parse(msg);
    if (message.event === 'submit') {
      const job = jobQueue.add(message.data);
      job.on('update', jobState => {
        console.log('Job Progress', jobState.progress);
        ws.send(JSON.stringify({ event: 'job', job: jobState }));
      });
    }
  });
  ws.on('close', () => {
    // cancel job?
    // if (socketJobId) {
    //   jobSockets.delete(socketJobId);
    // }
  });
});

app.get('/api/search', async (req, res) => {
  const polygon = req.query.polygon;
  const results = await usgsSearch(polygon);
  res.json(results);
});

// app.post('/api/job', async (req, res) => {
//   const data = req.body;
//   console.log('data', data);
//   res.sendStatus(201);

//   const job = jobQueue.add(data);

//   // get events for this job
//   job.on('update', (updated) => {
//     console.log('job updated', updated);
//   });

//   // broadcast({ task: 'download', step: 1, total: 4, label: 'Downloading lidar data' });
// });
// app.get('/api/render', async (req, res) => {
//   const { center, polygon } = req.query;
//   if (!center || !polygon) {
//     return res.sendStatus(400);
//   }
//   const polygonParsed = polygon.split(',').map(coord => coord.split(' ').map(parseFloat));
//   console.log(polygonParsed);
//   const centerParsed = center.split(',').map(parseFloat);
//   const result = await mapRender(polygonParsed, centerParsed);
//   res.json(result);
// });

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));