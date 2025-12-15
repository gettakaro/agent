import { createClient, RedisClientType } from 'redis';
import { config } from '../config.js';

let redis: RedisClientType | null = null;

export async function initRedis(): Promise<void> {
  redis = createClient({ url: config.redisUrl });

  redis.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  await redis.connect();
  console.log('Connected to Redis');
}

export function getRedis(): RedisClientType {
  if (!redis) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// PKCE verifier storage for OAuth flow
const PKCE_TTL_SECONDS = 600; // 10 minutes

export async function storePKCEVerifier(state: string, verifier: string): Promise<void> {
  const r = getRedis();
  await r.setEx(`pkce:${state}`, PKCE_TTL_SECONDS, verifier);
}

export async function getPKCEVerifier(state: string): Promise<string | null> {
  const r = getRedis();
  const verifier = await r.get(`pkce:${state}`);
  if (verifier) {
    await r.del(`pkce:${state}`);
  }
  return verifier;
}
