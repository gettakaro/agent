import { getDb } from "../db/connection.js";
import type { Conversation, ConversationCreate, MessageCreate, MessageRecord } from "./types.js";

export class ConversationRepo {
  async list(): Promise<Conversation[]> {
    const db = getDb();
    const rows = await db("conversations").select("*").orderBy("created_at", "desc");

    return rows.map(this.mapConversation);
  }

  async listByUserId(userId: string): Promise<Conversation[]> {
    const db = getDb();
    const rows = await db("conversations").where("user_id", userId).select("*").orderBy("created_at", "desc");

    return rows.map(this.mapConversation);
  }

  async create(data: ConversationCreate): Promise<Conversation> {
    const db = getDb();
    const [row] = await db("conversations")
      .insert({
        agent_id: data.agentId,
        agent_version: data.agentVersion,
        user_id: data.userId,
        title: data.title,
        provider: data.provider || "openrouter",
      })
      .returning("*");

    return this.mapConversation(row);
  }

  async get(id: string): Promise<Conversation | null> {
    const db = getDb();
    const row = await db("conversations").where("id", id).first();

    if (!row) return null;
    return this.mapConversation(row);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db("conversations").where("id", id).delete();
  }

  async updateState(id: string, state: Record<string, unknown>): Promise<void> {
    const db = getDb();
    await db("conversations")
      .where("id", id)
      .update({
        state: JSON.stringify(state),
        updated_at: new Date(),
      });
  }

  async getMessages(conversationId: string): Promise<MessageRecord[]> {
    const db = getDb();
    const rows = await db("messages").where("conversation_id", conversationId).orderBy("created_at", "asc");

    return rows.map(this.mapMessage);
  }

  async addMessage(
    conversationId: string,
    message: MessageCreate,
    extra?: { tokenCount?: number; latencyMs?: number },
  ): Promise<MessageRecord> {
    const db = getDb();
    const [row] = await db("messages")
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        tool_calls: message.toolExecutions ? JSON.stringify(message.toolExecutions) : null,
        token_count: extra?.tokenCount,
        latency_ms: extra?.latencyMs,
      })
      .returning("*");

    return this.mapMessage(row);
  }

  private mapConversation(row: Record<string, unknown>): Conversation {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      agentVersion: row.agent_version as string,
      userId: row.user_id as string | undefined,
      title: row.title as string | undefined,
      provider: (row.provider as Conversation["provider"]) || "openrouter",
      metadata:
        typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>) || {},
      state: typeof row.state === "string" ? JSON.parse(row.state) : (row.state as Record<string, unknown>) || {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapMessage(row: Record<string, unknown>): MessageRecord {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      role: row.role as string,
      content: row.content as string,
      toolExecutions: row.tool_calls
        ? typeof row.tool_calls === "string"
          ? JSON.parse(row.tool_calls)
          : row.tool_calls
        : undefined,
      tokenCount: row.token_count as number | undefined,
      latencyMs: row.latency_ms as number | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
