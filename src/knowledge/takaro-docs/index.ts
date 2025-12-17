import type { ToolContext, ToolDefinition, ToolResult } from "../../agents/types.js";
import type { IKnowledgeBaseFactory, IngestionConfig, KnowledgeBase } from "../types.js";
import { vectorSearch } from "../vectorStore.js";

const KNOWLEDGE_BASE_ID = "takaro-docs";
const DEFAULT_VERSION = "latest";

const GITHUB_SOURCE = "https://github.com/gettakaro/takaro/tree/development/packages/web-docs/docs";

/**
 * Create the search tool for Takaro documentation.
 */
function createSearchTool(_version: string): ToolDefinition {
  return {
    name: "searchTakaroDocs",
    description:
      "Search the official Takaro documentation for guides, API references, concepts, and examples. " +
      "Use this when you need information about Takaro features, module development, hooks, commands, " +
      "cronjobs, functions, or any other Takaro-related topics.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query. Be specific about what you want to find.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)",
          minimum: 1,
          maximum: 20,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    execute: async (args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> => {
      const query = args.query as string;
      const limit = (args.limit as number) ?? 5;

      const results = await vectorSearch(KNOWLEDGE_BASE_ID, query, {
        limit,
        minScore: 0.3, // Filter out low-relevance results
      });

      if (results.length === 0) {
        return {
          success: true,
          output: {
            message: "No relevant documentation found for your query.",
            results: [],
          },
        };
      }

      return {
        success: true,
        output: {
          message: `Found ${results.length} relevant documentation sections.`,
          results: results.map((r) => ({
            content: r.content,
            source: r.metadata.sourceFile ?? "unknown",
            relevance: `${Math.round(r.score * 100)}%`,
          })),
        },
      };
    },
  };
}

/**
 * Factory for creating Takaro documentation knowledge base instances.
 */
export class TakaroDocsFactory implements IKnowledgeBaseFactory {
  readonly knowledgeBaseId = KNOWLEDGE_BASE_ID;

  createKnowledgeBase(version: string): KnowledgeBase {
    return {
      id: KNOWLEDGE_BASE_ID,
      version,
      name: "Takaro Documentation",
      description: "Official Takaro documentation including guides, API references, and module development tutorials.",
      searchTool: createSearchTool(version),
    };
  }

  listVersions(): string[] {
    return [DEFAULT_VERSION];
  }

  getDefaultVersion(): string {
    return DEFAULT_VERSION;
  }

  getIngestionConfig(): IngestionConfig {
    return {
      source: GITHUB_SOURCE,
      refreshSchedule: "0 * * * *", // Every hour (cheap check, only syncs if changes)
      extensions: [".md", ".txt"],
      chunkSize: 1000,
      chunkOverlap: 200,
    };
  }
}

/**
 * Get the GitHub source URL for ingesting Takaro docs.
 */
export function getTakaroDocsSource(): string {
  return GITHUB_SOURCE;
}
