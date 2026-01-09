/**
 * Hybrid search combining vector similarity and keyword matching.
 * Uses Reciprocal Rank Fusion (RRF) to merge results from both approaches.
 */

import { keywordSearch, vectorSearch } from "../data/index.js";
import { generateEmbedding } from "../embeddings.js";
import { fuseRankedLists } from "./fusion.js";
import type { RetrievalResult } from "./types.js";

/**
 * Perform hybrid search combining vector and keyword search.
 * Returns fused results ranked by RRF scores.
 *
 * @param knowledgeBaseId - Knowledge base to search
 * @param query - Search query
 * @param limit - Maximum results to return
 * @param minScore - Minimum RRF score threshold (0-1)
 * @returns Fused results ordered by relevance
 *
 * @example
 * const results = await hybridSearch('takaro-docs', 'moduleControllerCreate', 10);
 * // Returns results combining semantic similarity and exact keyword matches
 */
export async function hybridSearch(
  knowledgeBaseId: string,
  query: string,
  limit: number = 5,
  minScore: number = 0,
): Promise<RetrievalResult[]> {
  // Fetch more candidates from each source to improve fusion quality
  // RRF will combine and rerank these candidates
  const candidateLimit = Math.max(limit * 2, 20);

  // Execute vector and keyword search in parallel
  const [queryEmbedding, keywordResults] = await Promise.all([
    generateEmbedding(query),
    keywordSearch(knowledgeBaseId, query, candidateLimit),
  ]);

  const vectorResults = await vectorSearch(knowledgeBaseId, queryEmbedding, candidateLimit);

  // Convert to common format for fusion
  const vectorItems = vectorResults.map((r) => ({
    id: r.id,
    content: r.content,
    contentWithContext: r.contentWithContext,
    documentTitle: r.documentTitle,
    sectionPath: r.sectionPath,
    metadata: r.metadata,
    score: r.similarity,
  }));

  const keywordItems = keywordResults.map((r) => ({
    id: r.id,
    content: r.content,
    contentWithContext: r.contentWithContext,
    documentTitle: r.documentTitle,
    sectionPath: r.sectionPath,
    metadata: r.metadata,
    score: r.rank,
  }));

  // Fuse results using RRF
  const fusedResults = fuseRankedLists([vectorItems, keywordItems]);

  // Apply filters and limits
  return fusedResults.filter((r) => r.score >= minScore).slice(0, limit);
}
