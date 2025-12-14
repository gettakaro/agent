import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Conversations table
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('agent_id', 100).notNullable();
    table.string('agent_version', 50).notNullable();
    table.string('user_id', 255).nullable();
    table.string('title', 255).nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.jsonb('state').defaultTo('{}'); // Agent state (e.g., module being built)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('agent_id');
    table.index('user_id');
    table.index('created_at');
  });

  // Messages table
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('conversation_id')
      .notNullable()
      .references('id')
      .inTable('conversations')
      .onDelete('CASCADE');
    table.string('role', 20).notNullable(); // user, assistant, system, tool
    table.text('content').notNullable();
    table.jsonb('tool_calls').nullable(); // For assistant tool use
    table.jsonb('tool_results').nullable(); // For tool responses
    table.integer('token_count').nullable();
    table.integer('latency_ms').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('conversation_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversations');
}
