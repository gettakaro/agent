import knex, { Knex } from 'knex';
import { config } from '../config.js';

let db: Knex | null = null;

export function getDb(): Knex {
  if (!db) {
    db = knex({
      client: 'pg',
      connection: config.databaseUrl,
      pool: {
        min: 2,
        max: 10,
      },
    });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
