import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  PG_HOST: z.string().nonempty().optional(),
  PG_PORT: z.coerce.number().optional(),
  PG_DATABASE: z.string().optional(),
  PG_USER: z.string().optional(),
  PG_PASSWORD: z.string().optional(),
  PG_SSL: z
    .union([z.string(), z.boolean()])
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      return value?.toLowerCase() === 'true';
    })
    .optional(),
  DATABASE_URL: z.string().url().optional(),
  DEFAULT_LLM_MODEL: z.string().default('llama3'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  DEV_LOGIN_PASSWORD: z.string().min(1).default('Pa$$w0rd')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

