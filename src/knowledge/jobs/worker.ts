import { Worker } from 'bullmq';
import { getRedisConnection } from './connection.js';
import { getLastCommitSha, setLastCommitSha } from './syncState.js';
import {
  getLatestCommitSha,
  getChangedFiles,
  parseGitHubUrl,
  fetchFileContent,
} from '../ingest/github.js';
import { chunkText } from '../ingest/chunker.js';
import { ingestFromGitHub } from '../ingest/index.js';
import { upsertDocuments, deleteBySourceFile } from '../vectorStore.js';
import type { Document } from '../types.js';
import {
  KB_SYNC_QUEUE,
  type KBSyncJobData,
  type KBSyncResult,
} from './queue.js';

/**
 * Start the KB sync worker.
 * Processes sync jobs with smart incremental updates based on Git changes.
 */
export function startSyncWorker(): Worker<KBSyncJobData, KBSyncResult> {
  const worker = new Worker<KBSyncJobData, KBSyncResult>(
    KB_SYNC_QUEUE,
    async (job) => {
      const {
        knowledgeBaseId,
        version,
        source,
        extensions = ['.md', '.txt'],
        chunkSize = 1000,
        chunkOverlap = 200,
      } = job.data;

      // Parse the GitHub URL
      const parsed = parseGitHubUrl(source);
      const { owner, repo, branch, path } = parsed;

      // Get latest commit SHA for the path
      const latestSha = await getLatestCommitSha(owner, repo, branch, path || undefined);
      const lastSha = await getLastCommitSha(knowledgeBaseId);

      // First time sync - do full ingestion
      if (!lastSha) {
        const result = await ingestFromGitHub(knowledgeBaseId, version, source, {
          extensions,
          chunkSize,
          overlap: chunkOverlap,
          replaceExisting: true,
        });

        await setLastCommitSha(knowledgeBaseId, latestSha);

        return {
          type: 'full',
          sha: latestSha,
          chunksCreated: result.chunksCreated,
        };
      }

      // No changes - skip
      if (lastSha === latestSha) {
        return {
          type: 'skipped',
          sha: latestSha,
        };
      }

      // Incremental sync - get changed files

      const changes = await getChangedFiles(owner, repo, lastSha, latestSha, path || undefined);

      // Filter by extensions
      const filterByExt = (files: string[]) =>
        files.filter((f) => extensions.some((ext) => f.toLowerCase().endsWith(ext.toLowerCase())));

      const addedFiles = filterByExt(changes.added);
      const modifiedFiles = filterByExt(changes.modified);
      const removedFiles = filterByExt(changes.removed);

      // Delete chunks for removed and modified files
      for (const file of [...removedFiles, ...modifiedFiles]) {
        await deleteBySourceFile(knowledgeBaseId, file);
      }

      // Ingest new and modified files
      let chunksCreated = 0;
      const filesToIngest = [...addedFiles, ...modifiedFiles];

      for (const filePath of filesToIngest) {
        try {
          const content = await fetchFileContent(owner, repo, branch, filePath);
          const chunks = chunkText(content, filePath, {
            chunkSize,
            overlap: chunkOverlap,
          });

          const documents: Document[] = chunks.map((chunk) => ({
            content: chunk.content,
            metadata: chunk.metadata,
          }));

          await upsertDocuments(knowledgeBaseId, version, documents);
          chunksCreated += chunks.length;
        } catch (err) {
          console.error(`[KB Sync] Failed to process ${filePath}:`, err);
        }
      }

      // Update sync state
      await setLastCommitSha(knowledgeBaseId, latestSha);

      return {
        type: 'incremental',
        sha: latestSha,
        added: addedFiles.length,
        modified: modifiedFiles.length,
        removed: removedFiles.length,
        chunksCreated,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 1, // Process one KB at a time to avoid rate limits
    }
  );

  return worker;
}
