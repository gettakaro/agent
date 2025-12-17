import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('knowledge_sync_state', (table) => {
    table.string('knowledge_base_id', 255).primary();
    table.string('last_commit_sha', 40).notNullable();
    table.timestamp('last_synced_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('knowledge_sync_state');
}
