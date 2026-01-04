/**
 * Retrieval layer types.
 * This layer handles search logic and result fusion.
 */

/**
 * Thoroughness levels for retrieval.
 * Controls the tradeoff between speed and accuracy.
 */
export type Thoroughness = "fast" | "balanced" | "thorough";

/**
 * Options for the retrieve function.
 */
export interface RetrievalOptions {
  /** Thoroughness level (default: 'balanced') */
  thoroughness?: Thoroughness;
  /** Maximum number of results to return (default: 5) */
  limit?: number;
  /** Minimum score threshold (0-1, default: 0) */
  minScore?: number;
}

/**
 * A single search result from retrieval.
 */
export interface RetrievalResult {
  /** Unique chunk ID */
  id: string;
  /** Raw chunk content */
  content: string;
  /** Contextual content with document title and section */
  contentWithContext?: string;
  /** Document title */
  documentTitle?: string;
  /** Section path hierarchy */
  sectionPath?: string[];
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Combined relevance score (0-1, higher is better) */
  score: number;
}

/**
 * Result from the retrieve function.
 */
export interface RetrievalResponse {
  /** Search results ordered by relevance */
  results: RetrievalResult[];
  /** Thoroughness level used */
  thoroughness: Thoroughness;
  /** Latency in milliseconds */
  latencyMs: number;
}

/**
 * Item in a ranked list (used for fusion).
 */
export interface RankedItem {
  id: string;
  rank: number;
  originalScore: number;
}
