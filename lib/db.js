import { Pool } from 'pg';

// Connect to local PostgreSQL by default, or DATABASE_URL if configured
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'yogeshsoni'}@localhost:5432/${process.env.PGDATABASE || 'ephemera'}`;

let pool;

export function getPool() {
  if (!pool) {
    const isRemote =
      Boolean(process.env.DATABASE_URL) &&
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', { text, error: err.message });
    throw err;
  }
}
