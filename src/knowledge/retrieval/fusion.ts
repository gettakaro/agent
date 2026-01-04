/**
 * Reciprocal Rank Fusion (RRF) algorithm.
 * Combines multiple ranked result lists into a single fused ranking.
 *
 * Based on: "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods"
 * (Cormack, Clarke, and Buettcher, SIGIR 2009)
 */

import type { RankedItem, RetrievalResult } from "./types.js";

/**
 * RRF constant k value.
 * Research shows k=60 performs well across datasets.
 * Lower k gives more weight to top-ranked items.
 */
const RRF_K = 60;

/**
 * Combine multiple ranked result lists using Reciprocal Rank Fusion.
 *
 * RRF score for item i = sum over all lists L of: 1 / (k + rank_L(i))
 * where rank_L(i) is the rank of item i in list L (0-indexed)
 *
 * @param lists - Array of ranked result lists (each list should be ordered by relevance)
 * @returns Combined results ordered by RRF score (highest first)
 *
 * @example
 * const vectorResults = [{id: 'a', score: 0.9}, {id: 'b', score: 0.7}];
 * const keywordResults = [{id: 'b', score: 8.5}, {id: 'c', score: 6.2}];
 * const fused = fuseRankedLists([vectorResults, keywordResults]);
 * // Result: Items ranked by combined RRF scores
 */
export function fuseRankedLists<T extends { id: string; score: number }>(lists: T[][]): T[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0]!;

  // Build RRF scores for each item across all lists
  const rrfScores = new Map<string, number>();
  const itemsById = new Map<string, T>();

  for (const list of lists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank]!;
      const rrfScore = 1 / (RRF_K + rank);

      // Accumulate RRF score
      const currentScore = rrfScores.get(item.id) ?? 0;
      rrfScores.set(item.id, currentScore + rrfScore);

      // Store item (use first occurrence if item appears in multiple lists)
      if (!itemsById.has(item.id)) {
        itemsById.set(item.id, item);
      }
    }
  }

  // Convert to array and sort by RRF score (descending)
  const fusedResults = Array.from(rrfScores.entries())
    .map(([id, rrfScore]) => {
      const item = itemsById.get(id)!;
      return {
        ...item,
        score: rrfScore, // Replace original score with RRF score
      };
    })
    .sort((a, b) => b.score - a.score);

  return fusedResults;
}

/**
 * Normalize RRF scores to 0-1 range.
 * Useful for displaying scores as percentages.
 */
export function normalizeScores<T extends { score: number }>(items: T[]): T[] {
  if (items.length === 0) return items;

  const maxScore = Math.max(...items.map((i) => i.score));
  const minScore = Math.min(...items.map((i) => i.score));
  const range = maxScore - minScore;

  if (range === 0) {
    // All scores are the same, return as-is
    return items;
  }

  return items.map((item) => ({
    ...item,
    score: (item.score - minScore) / range,
  }));
}
