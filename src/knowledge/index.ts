// Types

// Compatibility exports - maintain old API while using new data layer
export { upsertDocuments, vectorSearch } from "./compat.js";
// Data layer
export {
  deleteByKnowledgeBase,
  deleteBySourceFile,
  getDocumentCount,
  insertChunks,
  keywordSearch,
  vectorSearch as rawVectorSearch,
} from "./data/index.js";
export type { ChunkInsert, EmbeddingChunk, KeywordSearchResult, VectorSearchResult } from "./data/types.js";
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
export type { ResearchOptions, ResearchResult } from "./retrieval/agentic.js";
// Retrieval layer - hybrid search with RRF fusion
export { researchTopic, retrieve } from "./retrieval/index.js";
export type { RetrievalOptions, RetrievalResponse, RetrievalResult, Thoroughness } from "./retrieval/types.js";
export type { ResearchTopicOptions, SearchDocsOptions } from "./tools/index.js";
// Tools - agent tool factories
export { createResearchTopicTool, createSearchDocsTool } from "./tools/index.js";
export type {
  Document,
  IKnowledgeBaseFactory,
  IngestionConfig,
  IngestResult,
  KnowledgeBase,
  SearchOptions,
  SearchResult,
} from "./types.js";
