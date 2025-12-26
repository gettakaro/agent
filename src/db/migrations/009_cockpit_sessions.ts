import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("cockpit_sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table.uuid("conversation_id").notNullable().unique().references("id").inTable("conversations").onDelete("CASCADE");
    table.string("user_id", 255).notNullable();
    table.string("mock_server_game_server_id", 255).nullable();
    table.string("mock_server_status", 20).notNullable().defaultTo("stopped");
    table.string("selected_player_id", 255).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("mock_server_game_server_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("cockpit_sessions");
}
