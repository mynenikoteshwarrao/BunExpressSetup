import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env (see .env.example).');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * The Drizzle handle every service queries through. Exported so application
 * code can build its own ACID flows with `db.transaction(async (tx) => ...)`.
 */
export const db = drizzle(pool);

export const connectDB = async (): Promise<void> => {
  await pool.query('SELECT 1');
  console.log('✅ PostgreSQL connected');
};

export const closeDB = async (): Promise<void> => {
  await pool.end();
};

export const isValidId = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export default connectDB;
