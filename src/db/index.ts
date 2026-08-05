import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export const getPostgresHost = () => process.env.SQL_HOST || process.env.PGHOST;

export const createPool = () => {
  const host = getPostgresHost();
  if (!host) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host,
      user: process.env.SQL_USER || process.env.PGUSER,
      password: process.env.SQL_PASSWORD || process.env.PGPASSWORD,
      database: process.env.SQL_DB_NAME || process.env.PGDATABASE,
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = pool ? drizzle(pool, { schema }) : null;

export async function initDbSchema() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          name TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          total_amount NUMERIC NOT NULL,
          status TEXT NOT NULL,
          device_source TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Cloud SQL] Schema auto-initialized successfully.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (err?.code === '42501' || err?.message?.includes('permission denied for schema public')) {
      console.log('[Cloud SQL] Schema managed externally or pre-existing (public schema write restricted). Operating with resilient fallback state.');
    } else {
      console.warn('[Cloud SQL] Schema auto-init status:', err?.message || err);
    }
  }
}

