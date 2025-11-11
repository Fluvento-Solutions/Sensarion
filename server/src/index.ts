import express from 'express';
import morgan from 'morgan';

import { env } from './config/env';
import dbRouter from './routes/db';
import healthRouter from './routes/health';
import ollamaRouter from './routes/ollama';
import authRouter from './routes/auth';

const app = express();

app.use((await import('cors')).default());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/health', healthRouter);
app.use('/api/db', dbRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api/auth', authRouter);

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Not Found' });
});

const server = app.listen(env.PORT, () => {
  console.log(`✅ API server listening on http://localhost:${env.PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('🛑 Server closed');
  });
});

