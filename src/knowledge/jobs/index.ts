export { getRedisConnection, closeRedisConnection } from './connection.js';
export {
  KB_SYNC_QUEUE,
  getSyncQueue,
  closeSyncQueue,
  type KBSyncJobData,
  type KBSyncResult,
} from './queue.js';
export {
  getLastCommitSha,
  setLastCommitSha,
  getLastSyncTime,
} from './syncState.js';
export { startSyncWorker } from './worker.js';
export { scheduleKBSyncJobs, unscheduleKBSyncJob } from './scheduler.js';
