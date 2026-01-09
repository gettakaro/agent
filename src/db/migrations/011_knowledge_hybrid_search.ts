import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add new columns for hybrid search and contextual chunking
  await knex.schema.alterTable("knowledge_embeddings", (table) => {
    // Contextual content - chunk with document title and section prepended
    table.text("content_with_context");

    // Document metadata extracted from markdown
    table.string("document_title", 255);

    // Section path as array (e.g., ['Modules', 'Hooks', 'Player Events'])
    table.specificType("section_path", "TEXT[]");
  });

  // Add generated tsvector column for full-text search
  await knex.raw(`
    ALTER TABLE knowledge_embeddings
    ADD COLUMN content_tsvector TSVECTOR
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
  `);

  // Create GIN index for full-text search (BM25-style ranking)
  await knex.raw(`
    CREATE INDEX knowledge_embeddings_tsvector_idx
    ON knowledge_embeddings
    USING gin(content_tsvector)
  `);

  // Truncate existing embeddings to ensure clean state with new schema
  // Users will need to re-sync their knowledge bases after migration
  await knex.raw("TRUNCATE TABLE knowledge_embeddings");
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("knowledge_embeddings", (table) => {
    table.dropColumn("content_with_context");
    table.dropColumn("content_tsvector");
    table.dropColumn("document_title");
    table.dropColumn("section_path");
  });
}
