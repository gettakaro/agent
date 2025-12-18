import { getDb } from "../db/connection.js";
import type { CustomAgent, CustomAgentCreate, CustomAgentUpdate } from "./types.js";

export class CustomAgentService {
  async create(userId: string, data: CustomAgentCreate): Promise<CustomAgent> {
    const db = getDb();
    const [row] = await db("custom_agents")
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        system_prompt: data.systemPrompt,
        tools: JSON.stringify(data.tools),
        knowledge_bases: JSON.stringify(data.knowledgeBases),
        model: data.model,
        temperature: data.temperature ?? 0.7,
        max_tokens: data.maxTokens ?? 8192,
      })
      .returning("*");
    return this.mapRow(row);
  }

  async update(id: string, userId: string, data: CustomAgentUpdate): Promise<CustomAgent | null> {
    const db = getDb();
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemPrompt !== undefined) updateData.system_prompt = data.systemPrompt;
    if (data.tools !== undefined) updateData.tools = JSON.stringify(data.tools);
    if (data.knowledgeBases !== undefined) updateData.knowledge_bases = JSON.stringify(data.knowledgeBases);
    if (data.model !== undefined) updateData.model = data.model;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.max_tokens = data.maxTokens;

    const [row] = await db("custom_agents").where({ id, user_id: userId }).update(updateData).returning("*");

    return row ? this.mapRow(row) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db("custom_agents").where({ id, user_id: userId }).delete();
    return deleted > 0;
  }

  async get(id: string, userId: string): Promise<CustomAgent | null> {
    const db = getDb();
    const row = await db("custom_agents").where({ id, user_id: userId }).first();
    return row ? this.mapRow(row) : null;
  }

  async getById(id: string): Promise<CustomAgent | null> {
    const db = getDb();
    const row = await db("custom_agents").where({ id }).first();
    return row ? this.mapRow(row) : null;
  }

  async listByUser(userId: string): Promise<CustomAgent[]> {
    const db = getDb();
    const rows = await db("custom_agents").where({ user_id: userId }).orderBy("updated_at", "desc");
    return rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): CustomAgent {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      description: row.description as string | null,
      systemPrompt: row.system_prompt as string,
      tools: typeof row.tools === "string" ? JSON.parse(row.tools) : (row.tools as string[]),
      knowledgeBases:
        typeof row.knowledge_bases === "string" ? JSON.parse(row.knowledge_bases) : (row.knowledge_bases as string[]),
      model: row.model as string,
      temperature: Number(row.temperature),
      maxTokens: row.max_tokens as number,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
