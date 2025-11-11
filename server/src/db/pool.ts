import { Pool, PoolClient } from 'pg';

import { env } from '../config/env';

type ManagedPool = Pool<PoolClient>;

let pool: ManagedPool | null = null;

const createPool = (): ManagedPool | null => {
  if (!env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL missing; PostgreSQL routes are disabled.');
    return null;
  }

  return new Pool<PoolClient>({
    connectionString: env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000
  });
};

export const getPool = (): ManagedPool | null => {
  if (!pool) {
    pool = createPool();
  }

  return pool;
};

export const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const currentPool = getPool();

  if (!currentPool) {
    throw new Error('Database pool unavailable. Check DATABASE_URL.');
  }

  const client = await currentPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

