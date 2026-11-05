import { Pool } from 'pg';

// Connect to local PostgreSQL by default, or DATABASE_URL if configured
const isProd = process.env.NODE_ENV === 'production';
const connectionString =
  process.env.DATABASE_URL ||
  (isProd
    ? null
    : `postgresql://${process.env.PGUSER || 'postgres'}@localhost:5432/${process.env.PGDATABASE || 'ephemera'}`);

/**
 * Global pool instance cached across development reloads to prevent connection leaks
 */
let pool = globalThis.__ephemeraPgPool;

export function getPool() {
  if (!pool) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Use your Supabase pooled (port 6543) connection string.');
    }
    const isRemote =
      Boolean(process.env.DATABASE_URL) &&
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      // Each serverless instance handles few requests at once, and many instances
      // run in parallel. Keep the per-instance pool small and point DATABASE_URL at
      // Supabase's transaction pooler (port 6543) so 100+ users never exhaust
      // Postgres connections.
      max: parseInt(process.env.DB_POOL_MAX || (isProd ? '3' : '10'), 10),
      connectionTimeoutMillis: 5000, // 5s connection wait limit
      idleTimeoutMillis: 10000,       // 10s idle release to recycle connections rapidly
      statement_timeout: 15000,       // never let a runaway query hold a connection
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected error on idle client:', err.message);
    });

    globalThis.__ephemeraPgPool = pool;
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  try {
    const res = await p.query(text, params);
    return res;
  } catch (err) {
    console.error('[PostgreSQL Query Error]:', { text: text.substring(0, 120), error: err.message });
    throw err;
  }
}
