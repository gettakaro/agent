/**
 * Search tool factory for knowledge bases.
 * Creates a searchDocs tool with thoroughness parameter.
 */

import type { ToolContext, ToolDefinition, ToolResult } from "../../agents/types.js";
import { retrieve } from "../retrieval/index.js";
import type { Thoroughness } from "../retrieval/types.js";

export interface SearchDocsOptions {
  /** Knowledge base ID to search */
  knowledgeBaseId: string;
  /** Human-readable name for the knowledge base */
  knowledgeBaseName: string;
  /** Description of what this knowledge base contains */
  description: string;
  /** Default thoroughness level */
  defaultThoroughness?: Thoroughness;
}

/**
 * Create a searchDocs tool for a knowledge base.
 * The tool uses the new retrieve() function with thoroughness parameter.
 */
export function createSearchDocsTool(options: SearchDocsOptions): ToolDefinition {
  const { knowledgeBaseId, knowledgeBaseName, description, defaultThoroughness = "balanced" } = options;

  const toolDescription = "Search the " + knowledgeBaseName + ". " + description;

  return {
    name: "searchDocs",
    description: toolDescription,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query. Be specific about what you want to find.",
        },
        thoroughness: {
          type: "string",
          enum: ["fast", "balanced", "thorough"],
          description:
            "Search thoroughness level:\n" +
            "- fast: Quick vector search (<200ms)\n" +
            "- balanced: Hybrid search with keyword matching (<500ms, recommended)\n" +
            "- thorough: Hybrid search + LLM reranking (<2s, highest quality)",
          default: defaultThoroughness,
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)",
          minimum: 1,
          maximum: 20,
          default: 5,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    execute: async (args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> => {
      const query = args.query as string;
      const thoroughness = (args.thoroughness as Thoroughness) ?? defaultThoroughness;
      const limit = (args.limit as number) ?? 5;

      try {
        const response = await retrieve(knowledgeBaseId, query, {
          thoroughness,
          limit,
          minScore: 0.3,
        });

        if (response.results.length === 0) {
          return {
            success: true,
            output: {
              message: "No relevant documentation found for: " + query,
              results: [],
              latencyMs: response.latencyMs,
            },
          };
        }

        const resultCount = response.results.length;
        const latency = response.latencyMs;
        const message = "Found " + resultCount + " sections (" + thoroughness + " search, " + latency + "ms)";

        return {
          success: true,
          output: {
            message,
            results: response.results.map((r) => {
              const sourceFile = r.metadata.sourceFile ?? "unknown";
              const section = r.sectionPath?.join(" > ") ?? r.documentTitle ?? null;
              const relevance = Math.round(r.score * 100) + "%";

              return {
                content: r.content,
                source: sourceFile,
                section,
                relevance,
              };
            }),
            latencyMs: response.latencyMs,
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          output: {
            error: "Search failed: " + errorMsg,
          },
        };
      }
    },
  };
}
