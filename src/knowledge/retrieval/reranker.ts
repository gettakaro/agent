/**
 * LLM-based reranking for search results.
 * Uses a fast LLM to score result relevance to the query.
 */

import OpenAI from "openai";
import { config } from "../../config.js";
import type { RetrievalResult } from "./types.js";

/**
 * Rerank search results using LLM relevance scoring.
 * Uses llama-3.1-8b-instruct via OpenRouter for fast, cost-effective reranking.
 *
 * @param query - Original search query
 * @param candidates - Candidate results from hybrid search
 * @param topK - Number of top results to return after reranking
 * @returns Reranked results ordered by LLM relevance scores
 *
 * @example
 * const candidates = await hybridSearch('takaro-docs', 'how do hooks work', 20);
 * const reranked = await rerank('how do hooks work', candidates, 5);
 * // Returns top 5 most relevant results as scored by LLM
 */
export async function rerank(
  query: string,
  candidates: RetrievalResult[],
  topK: number = 5,
): Promise<RetrievalResult[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= topK) return candidates; // No need to rerank if we have fewer candidates

  // Guard against missing API key
  if (!config.openrouterApiKey) {
    throw new Error(
      "OpenRouter API key is required for reranking. Set OPENROUTER_API_KEY environment variable or disable reranking.",
    );
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openrouterApiKey,
  });

  // Build prompt asking LLM to score each candidate's relevance
  const prompt = buildRerankingPrompt(query, candidates);

  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a relevance scoring assistant. Score how relevant each document is to the query on a scale of 0-10.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0, // Deterministic scoring
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      // Fallback: return candidates as-is if LLM fails
      console.warn("Reranking failed: no response from LLM, returning original order");
      return candidates.slice(0, topK);
    }

    // Parse scores from LLM response
    const scores = parseScores(content, candidates.length);

    // Combine candidates with scores and sort
    const scored = candidates.map((candidate, idx) => ({
      ...candidate,
      score: scores[idx] ?? 0,
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  } catch (error) {
    console.error("Reranking error:", error);
    // Fallback: return original candidates
    return candidates.slice(0, topK);
  }
}

/**
 * Build prompt for LLM reranking.
 */
function buildRerankingPrompt(query: string, candidates: RetrievalResult[]): string {
  let prompt = `Query: "${query}"\n\n`;
  prompt += "Rate the relevance of each document to the query (0-10, where 10 is most relevant):\n\n";

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    // Use content (not contentWithContext) for scoring to avoid bias from prepended context
    const snippet = candidate.content.slice(0, 300); // First 300 chars
    prompt += `Document ${i + 1}:\n${snippet}${candidate.content.length > 300 ? "..." : ""}\n\n`;
  }

  prompt += "Respond with ONLY a JSON array of scores, like: [8, 5, 9, 3, 7]\nScores:";

  return prompt;
}

/**
 * Parse LLM response to extract relevance scores.
 * Expects format: [score1, score2, ...]
 */
function parseScores(content: string, expectedCount: number): number[] {
  try {
    // Try to extract JSON array from response
    const match = content.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.warn("Could not parse scores from LLM response");
      return Array(expectedCount).fill(5); // Neutral scores
    }

    const scores = JSON.parse(match[0]) as number[];

    // Validate and normalize scores
    if (!Array.isArray(scores) || scores.length !== expectedCount) {
      console.warn(`Expected ${expectedCount} scores, got ${scores.length}`);
      return Array(expectedCount).fill(5);
    }

    // Normalize to 0-1 range
    return scores.map((s) => Math.max(0, Math.min(10, s)) / 10);
  } catch (error) {
    console.error("Error parsing scores:", error);
    return Array(expectedCount).fill(0.5); // Neutral scores
  }
}
