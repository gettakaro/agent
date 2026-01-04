import { createSearchDocsTool } from "../tools/index.js";
import type { IKnowledgeBaseFactory, IngestionConfig, KnowledgeBase } from "../types.js";

const KNOWLEDGE_BASE_ID = "takaro-docs";
const DEFAULT_VERSION = "latest";

const GITHUB_SOURCE = "https://github.com/gettakaro/takaro/tree/development/packages/web-docs/docs";

/**
 * Factory for creating Takaro documentation knowledge base instances.
 * Uses the new searchDocs tool with thoroughness parameter.
 */
export class TakaroDocsFactory implements IKnowledgeBaseFactory {
  readonly knowledgeBaseId = KNOWLEDGE_BASE_ID;

  createKnowledgeBase(version: string): KnowledgeBase {
    const searchTool = createSearchDocsTool({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      knowledgeBaseName: "Takaro Documentation",
      description:
        "Official Takaro documentation including guides, API references, concepts, and examples. " +
        "Use this when you need information about Takaro features, module development, hooks, commands, " +
        "cronjobs, functions, or any other Takaro-related topics.",
      defaultThoroughness: "balanced",
    });

    return {
      id: KNOWLEDGE_BASE_ID,
      version,
      name: "Takaro Documentation",
      description: "Official Takaro documentation including guides, API references, and module development tutorials.",
      searchTool,
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
      refreshSchedule: "0 * * * *",
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
