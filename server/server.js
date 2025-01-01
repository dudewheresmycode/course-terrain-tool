import path from 'path';
import express from 'express';
import expressWs from 'express-ws';

import './utils/startup.js';

import usgsSearch from './lib/usgs.js';
import { JobQueue } from './lib/jobs.js';

const PORT = process.env.PORT || 3133;
const DIST_PATH = path.resolve(process.cwd(), 'client/dist');

const app = express();

app.use(express.json());

app.use(express.static(DIST_PATH));
app.get('/', (req, res) => res.sendFile(path.join(DIST_PATH, 'index.html')));

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

app.listen(PORT, () => {
  // we set CTC_DEBUG when we run the app in develop mode and 
  // proxy the server behind the webpack dev server
  // so we hide this log message to avoid confusion about which address the user sees
  if (!process.env.CTC_DEBUG) {
    console.log(`Server running at http://localhost:${PORT}`);
  }
});