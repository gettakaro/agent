import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("custom_agents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table.string("user_id", 255).notNullable();
    table.string("name", 100).notNullable();
    table.text("description").nullable();
    table.text("system_prompt").notNullable();
    table.jsonb("tools").notNullable().defaultTo("[]");
    table.jsonb("knowledge_bases").notNullable().defaultTo("[]");
    table.string("model", 100).notNullable();
    table.decimal("temperature", 3, 2).defaultTo(0.7);
    table.integer("max_tokens").defaultTo(8192);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["user_id", "name"]);
    table.index("user_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("custom_agents");
}
