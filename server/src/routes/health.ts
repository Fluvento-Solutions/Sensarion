import { Router } from 'express';

import { env } from '../config/env';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      postgresConfigured: Boolean(env.PG_HOST && env.PG_DATABASE && env.PG_USER),
      ollamaBaseUrl: env.OLLAMA_BASE_URL
    }
  });
});

export default router;

