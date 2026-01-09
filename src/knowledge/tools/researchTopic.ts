import type { ToolDefinition } from "../../agents/types.js";
import { researchTopic } from "../retrieval/agentic.js";

/**
 * Options for creating the researchTopic tool.
 */
export interface ResearchTopicOptions {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  description?: string;
  maxIterations?: number; // Default: 3
  minResults?: number; // Default: 10
}

/**
 * Create a researchTopic tool for multi-step agentic retrieval.
 *
 * This tool breaks down complex topics into sub-queries, searches in parallel,
 * and combines results for comprehensive research.
 *
 * @example
 * const tool = createResearchTopicTool({
 *   knowledgeBaseId: 'takaro-docs',
 *   knowledgeBaseName: 'Takaro Documentation',
 *   description: 'Research complex topics in Takaro documentation',
 *   maxIterations: 3
 * });
 */
export function createResearchTopicTool(options: ResearchTopicOptions): ToolDefinition {
  const {
    knowledgeBaseId,
    knowledgeBaseName,
    description = `Research complex topics in ${knowledgeBaseName} using multi-step agentic retrieval.`,
    maxIterations = 3,
    minResults = 10,
  } = options;

  return {
    name: "researchTopic",
    description: `${description}

This tool breaks down complex topics into focused sub-queries, searches each in parallel, and combines results. Use this for:
- Complex questions requiring multiple perspectives
- Topics that span multiple documentation sections
- Comprehensive research needs

The tool will automatically:
1. Generate 2-4 focused sub-queries from your topic
2. Search each sub-query thoroughly in parallel
3. Deduplicate and rank results by relevance
4. Iterate if more results are needed (up to ${maxIterations} iterations)

Returns comprehensive findings with source citations.`,

    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The complex topic or question to research comprehensively",
        },
        maxIterations: {
          type: "number",
          description: "Maximum refinement iterations (1-5, default: 3)",
          minimum: 1,
          maximum: 5,
          default: maxIterations,
        },
        minResults: {
          type: "number",
          description: "Minimum unique results to find (default: 10)",
          minimum: 5,
          maximum: 30,
          default: minResults,
        },
      },
      required: ["topic"],
    },

    execute: async (args, _context) => {
      const topic = args.topic as string;
      const maxIter = (args.maxIterations as number | undefined) ?? maxIterations;
      const minRes = (args.minResults as number | undefined) ?? minResults;

      if (!topic) {
        return {
          success: false,
          output: "Error: topic parameter is required",
        };
      }

      try {
        const startTime = Date.now();
        const result = await researchTopic(knowledgeBaseId, topic, {
          maxIterations: maxIter,
          minResults: minRes,
          thoroughness: "thorough",
        });

        const latencyMs = Date.now() - startTime;

        // Format findings for agent consumption
        const formattedFindings = result.findings.map((finding, idx) => {
          const sectionPath = finding.sectionPath ? finding.sectionPath.join(" > ") : "N/A";
          const source = finding.metadata?.sourceFile || "unknown";
          const relevance = Math.round(finding.score * 100);

          return `
${idx + 1}. ${finding.documentTitle || "Untitled"} - ${sectionPath}
   Source: ${source}
   Relevance: ${relevance}%

   ${finding.content}
`;
        });

        const summary = `
# Research Results for: "${topic}"

Performed ${result.searchesPerformed} searches across ${result.iterations} iteration(s).
Found ${result.findings.length} unique, relevant results in ${latencyMs}ms.

---

${formattedFindings.join("\n---\n")}

---

## Summary
- Topic: ${topic}
- Searches performed: ${result.searchesPerformed}
- Iterations: ${result.iterations}
- Results found: ${result.findings.length}
- Total time: ${latencyMs}ms
`;

        return {
          success: true,
          output: summary.trim(),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          output: `Failed to research topic: ${errorMessage}`,
        };
      }
    },
  };
}
