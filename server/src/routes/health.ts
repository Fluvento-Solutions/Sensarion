import { Router } from 'express';

import { env } from '../config/env';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      databaseConfigured: Boolean(env.DATABASE_URL),
      ollamaBaseUrl: env.OLLAMA_BASE_URL
    }
  });
});

export default router;

