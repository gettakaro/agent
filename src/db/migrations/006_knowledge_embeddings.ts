import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Enable vector extension for pgvector
  await knex.raw("CREATE EXTENSION IF NOT EXISTS vector");

  // Knowledge embeddings table
  await knex.schema.createTable("knowledge_embeddings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table.string("knowledge_base_id", 255).notNullable();
    table.string("version", 50).notNullable();
    table.text("content").notNullable();
    // Vector column added via raw SQL (knex doesn't support vector type)
    table.jsonb("metadata").defaultTo("{}");
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["knowledge_base_id", "version"]);
  });

  // Add vector column (1536 dimensions - pgvector index limit is 2000)
  await knex.raw("ALTER TABLE knowledge_embeddings ADD COLUMN embedding vector(1536) NOT NULL");

  // Create HNSW index for similarity search (better recall than IVFFlat)
  await knex.raw(`
    CREATE INDEX knowledge_embeddings_embedding_idx
    ON knowledge_embeddings
    USING hnsw (embedding vector_cosine_ops)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("knowledge_embeddings");
  // Note: We don't drop the vector extension as other things might depend on it
}
