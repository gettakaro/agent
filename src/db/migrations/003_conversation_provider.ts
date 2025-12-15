import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('conversations', (table) => {
    table.string('provider', 50).notNullable().defaultTo('openrouter');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('conversations', (table) => {
    table.dropColumn('provider');
  });
}
