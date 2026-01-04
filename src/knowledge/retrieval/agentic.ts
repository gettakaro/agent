import OpenAI from "openai";
import type { RetrievalResult } from "./types.js";
import { retrieve } from "./index.js";
import { config } from "../../config.js";

/**
 * Agentic multi-step retrieval that breaks down complex topics
 * into sub-queries and performs comprehensive research.
 */

export interface ResearchOptions {
  maxIterations?: number; // Maximum number of refinement iterations (default: 3)
  minResults?: number; // Minimum unique results needed (default: 10)
  thoroughness?: "balanced" | "thorough"; // Search thoroughness per sub-query (default: thorough)
}

export interface ResearchResult {
  topic: string;
  searchesPerformed: number;
  iterations: number;
  findings: RetrievalResult[];
}

interface SubQuery {
  query: string;
  reasoning: string;
}

/**
 * Generate sub-queries from a complex topic using LLM.
 */
async function generateSubQueries(topic: string, iteration: number): Promise<SubQuery[]> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openrouterApiKey,
  });

  const prompt = `You are a research assistant helping to break down a complex topic into focused search queries.

Topic: ${topic}

${iteration > 0 ? `This is refinement iteration ${iteration}. Generate different sub-queries to find missing information.` : ""}

Generate 2-4 focused search queries that will help find comprehensive information about this topic.
Each query should target a specific aspect or related concept.

Respond in JSON format:
[
  {
    "query": "specific search query",
    "reasoning": "why this query is relevant"
  }
]`;

  const response = await client.chat.completions.create({
    model: "meta-llama/llama-3.1-8b-instruct:free",
    messages: [
      {
        role: "system",
        content:
          "You are a research assistant that breaks down complex topics into focused search queries. Always respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from LLM for sub-query generation");
  }

  try {
    const subQueries = JSON.parse(content) as SubQuery[];
    if (!Array.isArray(subQueries) || subQueries.length === 0) {
      throw new Error("Invalid sub-queries format");
    }
    return subQueries.slice(0, 4); // Limit to 4 sub-queries
  } catch (error) {
    console.error("Failed to parse sub-queries:", content);
    // Fallback: use the original topic as single query
    return [{ query: topic, reasoning: "Original topic query" }];
  }
}

/**
 * Deduplicate results by content similarity (exact match for now).
 */
function deduplicateResults(results: RetrievalResult[]): RetrievalResult[] {
  const seen = new Set<string>();
  const deduplicated: RetrievalResult[] = [];

  for (const result of results) {
    // Use content hash for deduplication
    const key = result.content.trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(result);
    }
  }

  return deduplicated;
}

/**
 * Research a complex topic using multi-step agentic retrieval.
 * Breaks the topic into sub-queries, searches in parallel, and combines results.
 */
export async function researchTopic(
  knowledgeBaseId: string,
  topic: string,
  options: ResearchOptions = {},
): Promise<ResearchResult> {
  const { maxIterations = 3, minResults = 10, thoroughness = "thorough" } = options;

  let allFindings: RetrievalResult[] = [];
  let totalSearches = 0;
  let iteration = 0;

  console.log(`[AgenticResearch] Starting research on topic: ${topic}`);

  while (iteration < maxIterations) {
    console.log(`[AgenticResearch] Iteration ${iteration + 1}/${maxIterations}`);

    // Generate sub-queries for this iteration
    const subQueries = await generateSubQueries(topic, iteration);
    console.log(
      `[AgenticResearch] Generated ${subQueries.length} sub-queries:`,
      subQueries.map((sq) => sq.query),
    );

    // Execute all sub-queries in parallel
    const searchPromises = subQueries.map((subQuery) =>
      retrieve(knowledgeBaseId, subQuery.query, {
        thoroughness,
        limit: 5,
        minScore: 0.3,
      }),
    );

    const searchResults = await Promise.all(searchPromises);
    totalSearches += subQueries.length;

    // Combine and deduplicate results
    const newResults = searchResults.flatMap((r) => r.results);
    allFindings = deduplicateResults([...allFindings, ...newResults]);

    console.log(
      `[AgenticResearch] After iteration ${iteration + 1}: ${allFindings.length} unique findings`,
    );

    // Check if we have enough results
    if (allFindings.length >= minResults) {
      console.log(`[AgenticResearch] Sufficient results found (${allFindings.length} >= ${minResults})`);
      break;
    }

    iteration++;

    // If we're at the last iteration and still don't have enough, continue anyway
    if (iteration >= maxIterations) {
      console.log(
        `[AgenticResearch] Max iterations reached with ${allFindings.length} results (target: ${minResults})`,
      );
    }
  }

  // Sort by score descending and limit to top results
  const sortedFindings = allFindings.sort((a, b) => b.score - a.score).slice(0, 20);

  return {
    topic,
    searchesPerformed: totalSearches,
    iterations: iteration + 1,
    findings: sortedFindings,
  };
}
