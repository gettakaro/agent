import { createClient, type RedisClientType } from "redis";
import { config } from "../config.js";

let redis: RedisClientType | null = null;

export async function initRedis(): Promise<void> {
  redis = createClient({ url: config.redisUrl });

  redis.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  await redis.connect();
  console.log("Connected to Redis");
}

export function getRedis(): RedisClientType {
  if (!redis) {
    throw new Error("Redis not initialized. Call initRedis() first.");
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
