import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { healthRouter } from './routes/health.js';
import { createPublicRouter } from './routes/public.js';

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT ?? 3001);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173';

app.use(cors({ origin: webOrigin }));
app.use(express.json());
app.use('/api/health', healthRouter);

export const io = new Server(httpServer, {
  cors: { origin: webOrigin },
});

app.use('/api', createPublicRouter(io));

io.on('connection', (socket) => {
  socket.emit('connection:ready');
});

httpServer.listen(port, '127.0.0.1', () => {
  process.stdout.write(`API listening at http://127.0.0.1:${port}\n`);
});
