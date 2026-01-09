/**
 * Data layer types for knowledge base storage.
 * This layer handles pure database operations without search logic.
 */

/**
 * Chunk of content with embeddings and metadata.
 * Represents a row in the knowledge_embeddings table.
 */
export interface EmbeddingChunk {
  id: string;
  knowledgeBaseId: string;
  version: string;

  /** Raw chunk content */
  content: string;

  /** Contextual content - chunk with document title and section prepended */
  contentWithContext?: string;

  /** Vector embedding (1536 dimensions) */
  embedding: number[];

  /** Document title extracted from markdown */
  documentTitle?: string;

  /** Section hierarchy (e.g., ['Modules', 'Hooks', 'Player Events']) */
  sectionPath?: string[];

  /** Additional metadata */
  metadata: Record<string, unknown>;

  createdAt: Date;
}

/**
 * Input for inserting new chunks into the database.
 */
export interface ChunkInsert {
  knowledgeBaseId: string;
  version: string;
  content: string;
  contentWithContext?: string;
  embedding: number[];
  documentTitle?: string;
  sectionPath?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Result from vector similarity search (raw database result).
 */
export interface VectorSearchResult {
  id: string;
  content: string;
  contentWithContext?: string;
  documentTitle?: string;
  sectionPath?: string[];
  metadata: Record<string, unknown>;
  /** Cosine similarity score (0-1, higher = more similar) */
  similarity: number;
}

/**
 * Result from keyword search (raw database result).
 */
export interface KeywordSearchResult {
  id: string;
  content: string;
  contentWithContext?: string;
  documentTitle?: string;
  sectionPath?: string[];
  metadata: Record<string, unknown>;
  /** BM25-style rank score */
  rank: number;
}
