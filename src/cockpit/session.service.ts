import { CockpitSessionRepo } from "./session.repo.js";
import type { CockpitSession, CockpitSessionCreate, CockpitSessionUpdate, MockServerStatus } from "./types.js";

export class CockpitSessionService {
  private repo = new CockpitSessionRepo();

  async create(data: CockpitSessionCreate): Promise<CockpitSession> {
    return this.repo.create(data);
  }

  async get(id: string): Promise<CockpitSession | null> {
    return this.repo.get(id);
  }

  async getByConversation(conversationId: string): Promise<CockpitSession | null> {
    return this.repo.getByConversation(conversationId);
  }

  async getOrCreate(conversationId: string, userId: string): Promise<CockpitSession> {
    const existing = await this.repo.getByConversation(conversationId);
    if (existing) return existing;
    return this.repo.create({ conversationId, userId });
  }

  async listByUser(userId: string): Promise<CockpitSession[]> {
    return this.repo.listByUser(userId);
  }

  async update(id: string, data: CockpitSessionUpdate): Promise<CockpitSession | null> {
    return this.repo.update(id, data);
  }

  async updateMockServer(
    id: string,
    gameServerId: string | null,
    status: MockServerStatus,
  ): Promise<CockpitSession | null> {
    return this.repo.update(id, {
      mockServerGameServerId: gameServerId,
      mockServerStatus: status,
    });
  }

  async updateSelectedPlayer(id: string, playerId: string | null): Promise<CockpitSession | null> {
    return this.repo.update(id, { selectedPlayerId: playerId });
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
