import { getDb } from "../../db/connection.js";

const TABLE = "knowledge_sync_state";

/**
 * Get the last synced commit SHA for a knowledge base.
 */
export async function getLastCommitSha(knowledgeBaseId: string): Promise<string | null> {
  const db = getDb();
  const row = await db(TABLE).where("knowledge_base_id", knowledgeBaseId).first();
  return row?.last_commit_sha ?? null;
}

/**
 * Set the last synced commit SHA for a knowledge base.
 * Uses upsert to handle both insert and update cases.
 */
export async function setLastCommitSha(knowledgeBaseId: string, sha: string): Promise<void> {
  const db = getDb();
  await db(TABLE)
    .insert({
      knowledge_base_id: knowledgeBaseId,
      last_commit_sha: sha,
      last_synced_at: new Date(),
    })
    .onConflict("knowledge_base_id")
    .merge(["last_commit_sha", "last_synced_at"]);
}

/**
 * Get the last sync timestamp for a knowledge base.
 */
export async function getLastSyncTime(knowledgeBaseId: string): Promise<Date | null> {
  const db = getDb();
  const row = await db(TABLE).where("knowledge_base_id", knowledgeBaseId).first();
  return row?.last_synced_at ?? null;
}
