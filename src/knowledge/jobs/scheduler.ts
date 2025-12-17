import { knowledgeRegistry } from "../registry.js";
import { getSyncQueue } from "./queue.js";
import { getLastCommitSha } from "./syncState.js";

/**
 * Schedule sync jobs for all knowledge bases with refresh schedules.
 * Also queues immediate sync for any KB that has never been synced.
 */
export async function scheduleKBSyncJobs(): Promise<void> {
  const queue = getSyncQueue();

  for (const kbId of knowledgeRegistry.listKnowledgeBaseTypes()) {
    const factory = knowledgeRegistry.getFactory(kbId);
    if (!factory?.getIngestionConfig) {
      continue;
    }

    const config = factory.getIngestionConfig();
    if (!config.refreshSchedule) {
      continue;
    }

    const version = factory.getDefaultVersion();
    const repeatKey = `kb-sync-${kbId}`;

    // Register repeated job with cron schedule
    await queue.add(
      "sync",
      {
        knowledgeBaseId: kbId,
        version,
        source: config.source,
        extensions: config.extensions,
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
      },
      {
        repeat: {
          pattern: config.refreshSchedule,
          key: repeatKey,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    // Check if this KB has never been synced - queue immediate sync
    const lastSha = await getLastCommitSha(kbId);
    if (!lastSha) {
      await queue.add(
        "immediate-sync",
        {
          knowledgeBaseId: kbId,
          version,
          source: config.source,
          extensions: config.extensions,
          chunkSize: config.chunkSize,
          chunkOverlap: config.chunkOverlap,
        },
        {
          removeOnComplete: true,
          removeOnFail: { count: 5 },
        },
      );
    }
  }
}

/**
 * Remove all scheduled jobs for a knowledge base.
 */
export async function unscheduleKBSyncJob(kbId: string): Promise<void> {
  const queue = getSyncQueue();
  const repeatKey = `kb-sync-${kbId}`;

  const repeatableJobs = await queue.getRepeatableJobs();
  const job = repeatableJobs.find((j) => j.key === repeatKey);

  if (job) {
    await queue.removeRepeatableByKey(job.key);
  }
}
