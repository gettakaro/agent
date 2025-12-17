import { Redis } from "ioredis";
import { config } from "../../config.js";

let connection: Redis | null = null;

/**
 * Get the Redis connection for BullMQ.
 * BullMQ requires ioredis (not the standard redis package).
 */
export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
  }
  return connection;
}

/**
 * Close the BullMQ Redis connection.
 */
export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
