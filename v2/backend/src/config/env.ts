import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // AI
  AI_MODE: z.enum(['local', 'fallback']).default('local'),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  AI_MODEL: z.string().default('llama3-8b-instruct'),
  AI_TEMPERATURE: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.2'),
  AI_MAX_TOKENS: z.string().transform(Number).pipe(z.number().positive()).default('2048'),
  AI_REQUEST_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
  AI_PSEUDONYMIZE: z.string().transform(v => v === 'true').default('false'),
  OPENROUTER_API_KEY: z.string().default(''),
  
  // Server
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  
  // Exports
  EXPORT_DIR: z.string().default('./exports'),
  
  // Payment (Optional)
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  PADDLE_API_KEY: z.string().default(''),
  PADDLE_WEBHOOK_SECRET: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

