/**
 * Main retrieval layer entry point.
 * Provides the retrieve() function that routes to appropriate search strategies.
 */

import { vectorSearch } from "../data/index.js";
import type { RetrievalOptions, RetrievalResponse, RetrievalResult } from "./types.js";

export type { ResearchOptions, ResearchResult } from "./agentic.js";
export { researchTopic } from "./agentic.js";
export type { RetrievalOptions, RetrievalResponse, RetrievalResult, Thoroughness } from "./types.js";

/**
 * Retrieve relevant documents for a query.
 * Routes to appropriate search strategy based on thoroughness level.
 *
 * - fast: Vector search only (<200ms)
 * - balanced: Hybrid search with RRF fusion (<500ms)
 * - thorough: Hybrid search + LLM reranking (<2s)
 *
 * @example
 * const response = await retrieve('takaro-docs', 'how do hooks work', {
 *   thoroughness: 'balanced',
 *   limit: 5
 * });
 */
export async function retrieve(
  knowledgeBaseId: string,
  query: string,
  options: RetrievalOptions = {},
): Promise<RetrievalResponse> {
  const { thoroughness = "balanced", limit = 5, minScore = 0 } = options;
  const startTime = Date.now();

  let results: RetrievalResult[];

  switch (thoroughness) {
    case "fast":
      // Fast mode: Vector search only
      results = await fastRetrieve(knowledgeBaseId, query, limit, minScore);
      break;

    case "balanced":
      // Balanced mode: Hybrid search (vector + keyword + RRF)
      results = await balancedRetrieve(knowledgeBaseId, query, limit, minScore);
      break;

    case "thorough":
      // Thorough mode: Hybrid search + LLM reranking
      results = await thoroughRetrieve(knowledgeBaseId, query, limit, minScore);
      break;

    default:
      throw new Error(`Unknown thoroughness level: ${thoroughness}`);
  }

  const latencyMs = Date.now() - startTime;

  // Log latency for monitoring
  console.log(`[Retrieval] ${thoroughness} mode completed in ${latencyMs}ms (${results.length} results)`);

  return {
    results,
    thoroughness,
    latencyMs,
  };
}

/**
 * Fast retrieval using pure vector search.
 * Target latency: <200ms
 */
async function fastRetrieve(knowledgeBaseId: string, query: string, limit: number, minScore: number) {
  const { generateEmbedding } = await import("../embeddings.js");
  const queryEmbedding = await generateEmbedding(query);
  const vectorResults = await vectorSearch(knowledgeBaseId, queryEmbedding, limit);

  // Convert to RetrievalResult format
  return vectorResults
    .filter((r) => r.similarity >= minScore)
    .map((r) => ({
      id: r.id,
      content: r.content,
      contentWithContext: r.contentWithContext,
      documentTitle: r.documentTitle,
      sectionPath: r.sectionPath,
      metadata: r.metadata,
      score: r.similarity,
    }));
}

/**
 * Balanced retrieval using hybrid search (vector + keyword + RRF).
 * Target latency: <500ms
 */
async function balancedRetrieve(knowledgeBaseId: string, query: string, limit: number, minScore: number) {
  const { hybridSearch } = await import("./hybrid.js");
  return await hybridSearch(knowledgeBaseId, query, limit, minScore);
}

/**
 * Thorough retrieval using hybrid search + LLM reranking.
 * Target latency: <2s
 */
async function thoroughRetrieve(knowledgeBaseId: string, query: string, limit: number, minScore: number) {
  const { hybridSearch } = await import("./hybrid.js");
  const { rerank } = await import("./reranker.js");

  // Fetch more candidates for reranking (2-3x the limit)
  const candidateLimit = Math.max(limit * 3, 20);
  const candidates = await hybridSearch(knowledgeBaseId, query, candidateLimit, minScore);

  // Rerank using LLM and return top results
  return await rerank(query, candidates, limit);
}
