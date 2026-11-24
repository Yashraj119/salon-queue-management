import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { healthRouter } from './routes/health.js';
import { createPublicRouter } from './routes/public.js';

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const allowedWebOrigins = (process.env.WEB_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = allowedWebOrigins.length > 0 ? allowedWebOrigins : false;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use('/api/health', healthRouter);

export const io = new Server(httpServer, {
  cors: { origin: corsOrigin },
});

app.use('/api', createPublicRouter(io));

io.on('connection', (socket) => {
  socket.emit('connection:ready');
});

httpServer.listen(port, host, () => {
  process.stdout.write(`API listening on ${host}:${port}\n`);
});
