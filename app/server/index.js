import express from 'express';
import expressWs from 'express-ws';
import log from 'electron-log';

import usgsSearch from './lib/usgs.js';
import { JobQueue } from './lib/jobs.js';

export const jobQueue = new JobQueue();

export const app = express();
export const wsInstance = expressWs(app);

app.use(express.json());

app.ws('/progress', (ws, req) => {
  log.debug('websocket opened');
  ws.on('message', (msg) => {
    log.debug('new websocket message');
    const message = JSON.parse(msg);

    // create a new job
    if (message.event === 'submit') {
      const job = jobQueue.add(message.data);
      job.on('update', jobState => {
        ws.send(JSON.stringify({ event: 'job', job: jobState }));
      });
    }
  });
  ws.on('close', () => {
    // TODO: cancel active job?
    log.debug('websocket closed');
  });
});

app.get('/api/search', async (req, res) => {
  const polygon = req.query.polygon;
  const results = await usgsSearch(polygon);
  res.json(results);
});
