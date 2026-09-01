import Logger from "../lib/Logger";
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

let pool: pg.Pool | null = null;
export let db: any = null;

export const getPostgresHost = () => process.env.SQL_HOST || process.env.PGHOST;

export const initPool = () => {
  if (pool) return pool;

  const isProduction = process.env.NODE_ENV === "production";
  const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME || process.env.INSTANCE_CONNECTION_NAME;
  const user = process.env.SQL_USER || process.env.PGUSER;
  const password = process.env.SQL_PASSWORD || process.env.PGPASSWORD;
  const database = process.env.SQL_DB_NAME || process.env.PGDATABASE;

  let poolConfig: pg.PoolConfig = {
    max: isProduction ? 25 : 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000, // 10s statement timeout
  };

  if (isProduction && !connectionName) {
    throw new Error("CLOUD_SQL_CONNECTION_NAME must be supplied by the deployment environment.");
  }

  if (isProduction && connectionName) {
    // Unix Socket connection path for Google Cloud SQL in Cloud Run target runtime
    // OR Cloud Spanner PGAdapter running as a sidecar via localhost
    const useSpannerPGAdapter = process.env.USE_SPANNER_PG_ADAPTER === "true";
    poolConfig = {
      ...poolConfig,
      host: useSpannerPGAdapter ? "localhost" : `/cloudsql/${connectionName}`,
      port: useSpannerPGAdapter ? 5432 : undefined,
      user: user || "postgres",
      database: database || "postgres",
    };
    if (typeof password === "string" && password.length > 0) {
      poolConfig.password = password;
    }
  } else {
    const host = getPostgresHost() || "localhost";
    const port = process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432;
    poolConfig = {
      ...poolConfig,
      host,
      port,
      user: user || "postgres",
      database: database || "postgres",
    };
    if (typeof password === "string" && password.length > 0) {
      poolConfig.password = password;
    }
  }

  pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    Logger.error("Unexpected database pool client error:", err.message);
  });

  db = drizzle(pool, { schema });
  return pool;
};

export async function initDbSchema() {
  try {
    const activePool = initPool();
    const client = await activePool.connect();
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
          items TEXT,
          return_status TEXT,
          return_reason TEXT,
          reminder_set BOOLEAN DEFAULT FALSE,
          reminder_time TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        ALTER TABLE orders ADD COLUMN IF NOT EXISTS items TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_set BOOLEAN DEFAULT FALSE;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_time TEXT;

        CREATE TABLE IF NOT EXISTS "Product" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          brand TEXT,
          category TEXT,
          price NUMERIC NOT NULL,
          image TEXT,
          description TEXT,
          "likesCount" INTEGER DEFAULT 0
        );
      `);

      // Seed the "Product" table if it's empty
      const checkProduct = await client.query('SELECT COUNT(*) FROM "Product"');
      if (parseInt(checkProduct.rows[0].count, 10) === 0) {
        const seedProducts = [
          {
            id: "mug",
            name: "Artisan Gradient Ceramic Mug",
            brand: "Nerelle Craft Studio",
            category: "Home & Craft",
            price: 48.00,
            image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
            description: "An elegant artisan ceramic mug with a gradient glaze featuring a large, perfectly round, thick handle. Handmade studio craftsmanship."
          },
          {
            id: "colorful_mug",
            name: "Vibrant Hand-Painted Ceramic Mug",
            brand: "Atelier Mosaic",
            category: "Home & Craft",
            price: 52.00,
            image: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=600&q=80",
            description: "A vibrant colorful hand-painted ceramic coffee mug on a clean surface. Studio product photography aesthetic."
          },
          {
            id: "perfume",
            name: "Nerelle Mineral Ornate Perfume Bottle",
            brand: "Nerelle Parfums",
            category: "Beauty & Fragrance",
            price: 185.00,
            image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80",
            description: "A luxury ornate glass perfume bottle called 'Nerelle'. Features real stone minerals, sodalite, and malachite accents."
          },
          {
            id: "sneaker",
            name: "Sculptural Modular Running Sneaker",
            brand: "Aura Kinetic",
            category: "Sports Wear",
            price: 240.00,
            image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
            description: "Premium luxury running sneakers with a sculptural modular sole and upper made out of suede nubuck leather and mesh panels."
          },
          {
            id: "prod-rayban-meta-01",
            name: "Meta Wayfarer Smart Glasses (Matte Black / G-15)",
            brand: "Ray-Ban x Meta",
            category: "Smart Wearables",
            price: 299.00,
            image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80",
            description: "Next-gen smart glasses with ultra-wide 12MP camera, open-ear audio, Meta AI voice assistant, and seamless photo capture."
          },
          {
            id: "prod-cyber-jacket-02",
            name: "Architectural Techwear Modular Parka",
            brand: "ACRONYM / OmniStudio",
            category: "Winter Wear",
            price: 450.00,
            image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80",
            description: "Waterproof Gore-Tex Pro shell with detachable magnetic sling, fidlock buckles, and augmented spatial HUD tag."
          },
          {
            id: "prod-creator-ring-04",
            name: "Oura Ring Gen4 Horizon Smart Ring",
            brand: "Oura",
            category: "Smart Wearables",
            price: 349.00,
            image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
            description: "Precision titanium health ring with continuous sleep, HRV, body temperature, and stress telemetry."
          },
          {
            id: "prod-synth-headphones-05",
            name: "Aura Spatial Wireless ANC Headphones",
            brand: "Aura Audio",
            category: "Electronics",
            price: 380.00,
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
            description: "Lossless spatial audio with head tracking, custom planar magnetic drivers, and active noise cancellation."
          }
        ];

        for (const p of seedProducts) {
          await client.query(
            'INSERT INTO "Product" (id, name, brand, category, price, image, description, "likesCount") VALUES ($1, $2, $3, $4, $5, $6, $7, 0) ON CONFLICT (id) DO NOTHING',
            [p.id, p.name, p.brand, p.category, p.price, p.image, p.description]
          );
        }
        console.log(`[Database] Seeded ${seedProducts.length} products successfully.`);
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    // Schema init errors are non-fatal — logging is filtered by structured console streams
    Logger.error("Database schema validation notification:", err.message);
  }
}
