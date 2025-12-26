import { getDb } from "../db/connection.js";
import type { CockpitSession, CockpitSessionCreate, CockpitSessionUpdate, MockServerStatus } from "./types.js";

export class CockpitSessionRepo {
  async create(data: CockpitSessionCreate): Promise<CockpitSession> {
    const db = getDb();
    const [row] = await db("cockpit_sessions")
      .insert({
        conversation_id: data.conversationId,
        user_id: data.userId,
      })
      .returning("*");

    return this.mapSession(row);
  }

  async get(id: string): Promise<CockpitSession | null> {
    const db = getDb();
    const row = await db("cockpit_sessions").where("id", id).first();

    if (!row) return null;
    return this.mapSession(row);
  }

  async getByConversation(conversationId: string): Promise<CockpitSession | null> {
    const db = getDb();
    const row = await db("cockpit_sessions").where("conversation_id", conversationId).first();

    if (!row) return null;
    return this.mapSession(row);
  }

  async listByUser(userId: string): Promise<CockpitSession[]> {
    const db = getDb();
    const rows = await db("cockpit_sessions").where("user_id", userId).orderBy("created_at", "desc");

    return rows.map(this.mapSession);
  }

  async update(id: string, data: CockpitSessionUpdate): Promise<CockpitSession | null> {
    const db = getDb();
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (data.mockServerGameServerId !== undefined) {
      updateData.mock_server_game_server_id = data.mockServerGameServerId;
    }
    if (data.mockServerStatus !== undefined) {
      updateData.mock_server_status = data.mockServerStatus;
    }
    if (data.selectedPlayerId !== undefined) {
      updateData.selected_player_id = data.selectedPlayerId;
    }

    const [row] = await db("cockpit_sessions").where("id", id).update(updateData).returning("*");

    if (!row) return null;
    return this.mapSession(row);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db("cockpit_sessions").where("id", id).delete();
  }

  private mapSession(row: Record<string, unknown>): CockpitSession {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      userId: row.user_id as string,
      mockServerGameServerId: row.mock_server_game_server_id as string | null,
      mockServerStatus: row.mock_server_status as MockServerStatus,
      selectedPlayerId: row.selected_player_id as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
