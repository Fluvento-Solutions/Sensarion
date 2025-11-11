import { Router } from 'express';
import { z } from 'zod';

import { generateWithOllama } from '../services/ollama';

const router = Router();

const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt required'),
  model: z.string().default('llama3'),
  options: z.record(z.unknown()).optional()
});

router.post('/generate', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      errors: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const result = await generateWithOllama(parsed.data);
    res.json({ status: 'ok', result });
  } catch (error) {
    res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown Ollama error'
    });
  }
});

export default router;

