import { getDb } from '../db/connection.js';

export class ApiKeyService {
  async saveApiKey(userId: string, provider: string, apiKey: string): Promise<void> {
    const db = getDb();

    const existing = await db('user_api_keys')
      .where({ user_id: userId, provider })
      .first();

    if (existing) {
      await db('user_api_keys')
        .where({ user_id: userId, provider })
        .update({
          api_key: apiKey,
          updated_at: new Date(),
        });
    } else {
      await db('user_api_keys').insert({
        user_id: userId,
        provider,
        api_key: apiKey,
      });
    }
  }

  async getApiKey(userId: string, provider: string): Promise<string | null> {
    const db = getDb();
    const row = await db('user_api_keys')
      .where({ user_id: userId, provider })
      .first();

    if (!row) return null;

    return row['api_key'] as string;
  }

  async deleteApiKey(userId: string, provider: string): Promise<void> {
    const db = getDb();
    await db('user_api_keys').where({ user_id: userId, provider }).delete();
  }

  async hasApiKey(userId: string, provider: string): Promise<boolean> {
    const db = getDb();
    const row = await db('user_api_keys')
      .where({ user_id: userId, provider })
      .first();
    return !!row;
  }

  async listProviders(userId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db('user_api_keys')
      .where({ user_id: userId })
      .select('provider');
    return rows.map((r) => r['provider'] as string);
  }
}
