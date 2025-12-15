import { getDb } from '../db/connection.js';
import { refreshAccessToken, type TokenResponse } from './claude-oauth.js';

export interface ClaudeToken {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ClaudeTokenService {
  async getTokenForUser(userId: string): Promise<ClaudeToken | null> {
    const db = getDb();
    const row = await db('user_claude_tokens').where('user_id', userId).first();

    if (!row) return null;

    const token = this.mapToken(row);

    // Check if token is expired or about to expire (within 5 minutes)
    const expiryBuffer = 5 * 60 * 1000;
    if (token.expiresAt.getTime() - expiryBuffer < Date.now()) {
      return this.refreshToken(token);
    }

    return token;
  }

  async saveToken(userId: string, tokens: TokenResponse): Promise<ClaudeToken> {
    const db = getDb();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const existing = await db('user_claude_tokens').where('user_id', userId).first();

    if (existing) {
      const [row] = await db('user_claude_tokens')
        .where('user_id', userId)
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date(),
        })
        .returning('*');

      return this.mapToken(row);
    }

    const [row] = await db('user_claude_tokens')
      .insert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      })
      .returning('*');

    return this.mapToken(row);
  }

  async deleteToken(userId: string): Promise<void> {
    const db = getDb();
    await db('user_claude_tokens').where('user_id', userId).delete();
  }

  async hasToken(userId: string): Promise<boolean> {
    const db = getDb();
    const row = await db('user_claude_tokens').where('user_id', userId).first();
    return !!row;
  }

  private async refreshToken(token: ClaudeToken): Promise<ClaudeToken | null> {
    try {
      const newTokens = await refreshAccessToken(token.refreshToken);
      return this.saveToken(token.userId, newTokens);
    } catch (err) {
      console.error('Failed to refresh Claude token:', err);
      // Token refresh failed - user needs to re-authenticate
      await this.deleteToken(token.userId);
      return null;
    }
  }

  private mapToken(row: Record<string, unknown>): ClaudeToken {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      accessToken: row['access_token'] as string,
      refreshToken: row['refresh_token'] as string,
      expiresAt: new Date(row['expires_at'] as string),
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
