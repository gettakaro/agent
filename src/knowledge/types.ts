import type { ToolDefinition } from '../agents/types.js';

/**
 * A knowledge base that agents can query via its search tool.
 */
export interface KnowledgeBase {
  /** Unique identifier, e.g., 'takaro-docs' */
  id: string;
  /** Version or experiment name, e.g., '1.0.0' or 'chunk-512' */
  version: string;
  /** Human-readable name */
  name: string;
  /** Description of what this knowledge base contains */
  description: string;
  /** The search tool this KB exposes to agents */
  searchTool: ToolDefinition;
}

/**
 * Configuration for automatic knowledge base ingestion/refresh.
 */
export interface IngestionConfig {
  /** GitHub folder URL (e.g., https://github.com/owner/repo/tree/branch/path) */
  source: string;
  /** Cron schedule for sync checks (e.g., "0 * * * *" = every hour) */
  refreshSchedule?: string;
  /** File extensions to include (default: ['.md', '.txt']) */
  extensions?: string[];
  /** Chunk size in characters (default: 1000) */
  chunkSize?: number;
  /** Chunk overlap in characters (default: 200) */
  chunkOverlap?: number;
}

/**
 * Factory for creating knowledge base instances with different versions/experiments.
 * Mirrors the IAgentFactory pattern.
 */
export interface IKnowledgeBaseFactory {
  readonly knowledgeBaseId: string;
  createKnowledgeBase(version: string): KnowledgeBase;
  listVersions(): string[];
  getDefaultVersion(): string;
  /** Ingestion config for automatic refresh (optional) */
  getIngestionConfig?(): IngestionConfig;
}

/**
 * Document to be ingested into a knowledge base.
 */
export interface Document {
  /** Document content (text) */
  content: string;
  /** Arbitrary metadata stored with the embedding */
  metadata?: Record<string, unknown>;
}

/**
 * Result from vector similarity search.
 */
export interface SearchResult {
  /** The document content */
  content: string;
  /** Cosine similarity score (0-1, higher is more similar) */
  score: number;
  /** Document metadata */
  metadata: Record<string, unknown>;
}

/**
 * Options for vector search.
 */
export interface SearchOptions {
  /** Maximum results to return (default: 5) */
  limit?: number;
  /** Minimum similarity score threshold (default: 0) */
  minScore?: number;
  /** Filter by metadata fields */
  filters?: Record<string, unknown>;
}

/**
 * Result of an ingestion operation.
 */
export interface IngestResult {
  /** Number of documents processed */
  documentsProcessed: number;
  /** Number of chunks created */
  chunksCreated: number;
  /** Total tokens embedded */
  tokensEmbedded?: number;
}
