import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';

export const KB_SYNC_QUEUE = 'kb-sync';

export interface KBSyncJobData {
  knowledgeBaseId: string;
  version: string;
  source: string;
  extensions?: string[];
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface KBSyncResult {
  type: 'full' | 'incremental' | 'skipped';
  sha: string;
  added?: number;
  modified?: number;
  removed?: number;
  chunksCreated?: number;
}

let queue: Queue<KBSyncJobData, KBSyncResult> | null = null;

/**
 * Get the KB sync queue instance.
 */
export function getSyncQueue(): Queue<KBSyncJobData, KBSyncResult> {
  if (!queue) {
    queue = new Queue(KB_SYNC_QUEUE, {
      connection: getRedisConnection(),
    });
  }
  return queue;
}

/**
 * Close the queue connection.
 */
export async function closeSyncQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
