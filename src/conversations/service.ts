import { ConversationRepo } from './repo.js';
import type {
  Conversation,
  ConversationCreate,
  MessageRecord,
} from './types.js';
import type { Message } from '../agents/types.js';

export class ConversationService {
  private repo = new ConversationRepo();

  async list(): Promise<Conversation[]> {
    return this.repo.list();
  }

  async create(data: ConversationCreate): Promise<Conversation> {
    return this.repo.create(data);
  }

  async get(id: string): Promise<Conversation | null> {
    return this.repo.get(id);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async updateState(id: string, state: Record<string, unknown>): Promise<void> {
    return this.repo.updateState(id, state);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const records = await this.repo.getMessages(conversationId);
    return records.map((r) => ({
      role: r.role as 'user' | 'assistant' | 'system',
      content: r.content,
    }));
  }

  async addMessage(
    conversationId: string,
    message: Message,
    extra?: { tokenCount?: number; latencyMs?: number }
  ): Promise<MessageRecord> {
    return this.repo.addMessage(
      conversationId,
      {
        role: message.role,
        content: message.content,
      },
      extra
    );
  }
}
