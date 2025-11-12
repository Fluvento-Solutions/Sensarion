import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env';
import dbRouter from './routes/db';
import healthRouter from './routes/health';
import ollamaRouter from './routes/ollama';
import authRouter from './routes/auth';
import patientsRouter from './routes/patients';

const app = express();

app.use(
  cors({
    origin: ['http://localhost:5180', 'http://127.0.0.1:5180'],
    credentials: false
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/health', healthRouter);
app.use('/api/db', dbRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Not Found' });
});

const { PORT } = env;

const server = app.listen(PORT, () => {
  console.log(`✅ API server listening on http://localhost:${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${PORT} ist bereits belegt. Beende den bestehenden Prozess oder setze eine andere PORT-Variable.`
    );
    process.exit(1);
  }

  console.error('❌ Unerwarteter Serverfehler', error);
  process.exit(1);
});

const handleShutdown = (signal: NodeJS.Signals) => {
  console.log(`⏻ Signal ${signal} empfangen. Server wird heruntergefahren...`);
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

