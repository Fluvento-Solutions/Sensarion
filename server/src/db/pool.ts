import { Pool, PoolClient } from 'pg';

import { env } from '../config/env';

let pool: Pool | null = null;

const createPool = () => {
  if (!env.PG_HOST && !env.DATABASE_URL) {
    console.warn('⚠️  PostgreSQL env vars missing; DB routes will remain disabled until configured.');
    return null;
  }

  return new Pool({
    connectionString: env.DATABASE_URL,
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DATABASE,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl: env.PG_SSL ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30_000
  });
};

export const getPool = () => {
  if (!pool) {
    pool = createPool();
  }

  return pool;
};

export const withClient = async <T>(fn: (client: PoolClient) => Promise<T>) => {
  const currentPool = getPool();

  if (!currentPool) {
    throw new Error('Database pool unavailable. Check environment variables.');
  }

  const client = await currentPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

