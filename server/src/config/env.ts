import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required (e.g. postgres connection string).' })
    .url('DATABASE_URL must be a valid URL (postgresql://...)'),
  OLLAMA_BASE_URL: z
    .string()
    .url('OLLAMA_BASE_URL must be a valid URL')
    .default('http://localhost:11434'),
  DEFAULT_LLM_MODEL: z.string().min(1).default('mistral:instruct'),
  DEV_LOGIN_PASSWORD: z
    .string({ required_error: 'DEV_LOGIN_PASSWORD is required.' })
    .min(1, 'DEV_LOGIN_PASSWORD cannot be empty'),
  SESSION_SECRET: z
    .string({ required_error: 'SESSION_SECRET ist erforderlich.' })
    .min(16, 'SESSION_SECRET muss mindestens 16 Zeichen lang sein.')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

