import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import knex, { type Knex } from "knex";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TestDatabase {
  knex: Knex;
  container: StartedPostgreSqlContainer;
  connectionString: string;
}

export async function setupTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer("pgvector/pgvector:pg17").start();
  const connectionString = container.getConnectionUri();

  process.env.DATABASE_URL = connectionString;
  process.env.OPENROUTER_API_KEY = "test-api-key";

  const db = knex({
    client: "pg",
    connection: connectionString,
    migrations: {
      directory: path.join(__dirname, "../../src/db/migrations"),
      loadExtensions: [".ts", ".js"],
    },
  });

  await db.migrate.latest();

  return { knex: db, container, connectionString };
}

export async function teardownTestDatabase(testDb: TestDatabase): Promise<void> {
  const { closeDb } = await import("../../src/db/connection.js");
  await closeDb();
  await testDb.knex.destroy();
  await testDb.container.stop();
}

export async function truncateTables(db: Knex): Promise<void> {
  await db.raw("TRUNCATE TABLE messages, conversations RESTART IDENTITY CASCADE");
}
