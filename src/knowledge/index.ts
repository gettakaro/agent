// Types

// Embeddings
export {
  generateEmbedding,
  generateEmbeddings,
  getEmbeddingDimensions,
  getEmbeddingModel,
} from "./embeddings.js";
// Ingestion
export {
  type Chunk,
  type ChunkOptions,
  chunkFiles,
  chunkText,
  fetchFileContent,
  fetchGitHubDirectory,
  type IngestFromGitHubOptions,
  ingestFromGitHub,
  listGitHubFiles,
  parseGitHubUrl,
} from "./ingest/index.js";
// Jobs (BullMQ-based sync)
export {
  closeRedisConnection,
  closeSyncQueue,
  getLastCommitSha,
  getLastSyncTime,
  getSyncQueue,
  KB_SYNC_QUEUE,
  type KBSyncJobData,
  type KBSyncResult,
  scheduleKBSyncJobs,
  setLastCommitSha,
  startSyncWorker,
  unscheduleKBSyncJob,
} from "./jobs/index.js";
// Registry
export { knowledgeRegistry, type ResolvedKnowledgeBase } from "./registry.js";
export type {
  Document,
  IKnowledgeBaseFactory,
  IngestionConfig,
  IngestResult,
  KnowledgeBase,
  SearchOptions,
  SearchResult,
} from "./types.js";
// Vector store
export {
  deleteByKnowledgeBase,
  deleteBySourceFile,
  getDocumentCount,
  upsertDocuments,
  vectorSearch,
} from "./vectorStore.js";
