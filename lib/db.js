import { Pool } from 'pg';

// Connect to local PostgreSQL by default, or DATABASE_URL if configured
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'yogeshsoni'}@localhost:5432/${process.env.PGDATABASE || 'ephemera'}`;

/**
 * Global pool instance cached across development reloads to prevent connection leaks
 */
let pool = globalThis.__ephemeraPgPool;

export function getPool() {
  if (!pool) {
    const isRemote =
      Boolean(process.env.DATABASE_URL) &&
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      // Optimized for 50+ concurrent users:
      max: parseInt(process.env.DB_POOL_MAX || '25', 10),
      connectionTimeoutMillis: 5000, // 5s connection wait limit
      idleTimeoutMillis: 10000,       // 10s idle release to recycle connections rapidly
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
