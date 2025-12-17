// Types
export type {
  KnowledgeBase,
  IKnowledgeBaseFactory,
  IngestionConfig,
  Document,
  SearchResult,
  SearchOptions,
  IngestResult,
} from './types.js';

// Registry
export { knowledgeRegistry, type ResolvedKnowledgeBase } from './registry.js';

// Embeddings
export {
  generateEmbedding,
  generateEmbeddings,
  getEmbeddingModel,
  getEmbeddingDimensions,
} from './embeddings.js';

// Vector store
export {
  vectorSearch,
  upsertDocuments,
  deleteByKnowledgeBase,
  deleteBySourceFile,
  getDocumentCount,
} from './vectorStore.js';

// Ingestion
export {
  ingestFromGitHub,
  parseGitHubUrl,
  fetchGitHubDirectory,
  listGitHubFiles,
  fetchFileContent,
  chunkText,
  chunkFiles,
  type Chunk,
  type ChunkOptions,
  type IngestFromGitHubOptions,
} from './ingest/index.js';

// Jobs (BullMQ-based sync)
export {
  startSyncWorker,
  scheduleKBSyncJobs,
  unscheduleKBSyncJob,
  getSyncQueue,
  closeSyncQueue,
  closeRedisConnection,
  getLastCommitSha,
  setLastCommitSha,
  getLastSyncTime,
  KB_SYNC_QUEUE,
  type KBSyncJobData,
  type KBSyncResult,
} from './jobs/index.js';
