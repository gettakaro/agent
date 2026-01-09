import { createSearchDocsTool } from "../tools/index.js";
import type { IKnowledgeBaseFactory, IngestionConfig, KnowledgeBase } from "../types.js";

const KNOWLEDGE_BASE_ID = "community-modules";
const DEFAULT_VERSION = "latest";

const GITHUB_SOURCE = "https://github.com/gettakaro/community-modules-viewer/tree/main/public/modules";

/**
 * Factory for creating Community Modules knowledge base instances.
 * Contains user-contributed modules and examples from the Takaro community.
 */
export class CommunityModulesFactory implements IKnowledgeBaseFactory {
  readonly knowledgeBaseId = KNOWLEDGE_BASE_ID;

  createKnowledgeBase(version: string): KnowledgeBase {
    const searchTool = createSearchDocsTool({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      knowledgeBaseName: "Community Modules",
      description:
        "Takaro community-contributed modules and examples. " +
        "Use this when you need to find examples of modules, see how other developers have implemented features, " +
        "or need inspiration for module development.",
      defaultThoroughness: "balanced",
    });

    return {
      id: KNOWLEDGE_BASE_ID,
      version,
      name: "Community Modules",
      description: "User-contributed Takaro modules and examples from the community.",
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
      refreshSchedule: "0 */6 * * *", // Every 6 hours
      extensions: [".md", ".txt", ".json"],
      chunkSize: 1000,
      chunkOverlap: 200,
    };
  }
}

/**
 * Get the GitHub source URL for ingesting community modules.
 */
export function getCommunityModulesSource(): string {
  return GITHUB_SOURCE;
}
