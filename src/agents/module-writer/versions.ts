import { knowledgeRegistry } from "../../knowledge/index.js";
import type { AgentVersionConfig } from "../types.js";
import { SYSTEM_PROMPT_CONCISE } from "./prompts/concise.js";
import { SYSTEM_PROMPT_V1 } from "./prompts/v1.js";
import { moduleWriterTools } from "./tools/index.js";

/**
 * Module writer experiments.
 *
 * Each key is an experiment name used in compound IDs:
 *   module-writer/grok-fast
 *   module-writer/gpt-oss
 *   module-writer/concise
 *   module-writer/with-docs
 *
 * Once an experiment is proven, it can be promoted to stable:
 *   module-writer@1.0.0
 */

// Base experiments without KB tools
const BASE_EXPERIMENTS: Record<string, AgentVersionConfig> = {
  "grok-fast": {
    model: "x-ai/grok-code-fast-1",
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: moduleWriterTools,
    temperature: 0.7,
    maxTokens: 8192,
    description: "Fast module development using Grok. Balanced speed and quality for rapid prototyping.",
  },
  "gpt-oss": {
    model: "openai/gpt-4.1-nano",
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: moduleWriterTools,
    temperature: 0.7,
    maxTokens: 8192,
    description: "OpenAI-based module writer. General-purpose development with broad knowledge.",
  },
  concise: {
    model: "x-ai/grok-code-fast-1",
    systemPrompt: SYSTEM_PROMPT_CONCISE,
    tools: moduleWriterTools,
    temperature: 0.5,
    maxTokens: 4096,
    description: "Minimal, to-the-point responses. Lower token usage for experienced users.",
  },
};

// Experiments that require KB tools (resolved at runtime)
const KB_ENHANCED_EXPERIMENTS = ["with-docs"] as const;

/**
 * Get experiment config, resolving KB tools at runtime.
 */
export function getExperimentConfig(experiment: string): AgentVersionConfig | undefined {
  // Check base experiments first
  if (experiment in BASE_EXPERIMENTS) {
    return BASE_EXPERIMENTS[experiment];
  }

  // Handle KB-enhanced experiments
  if (experiment === "with-docs") {
    const kb = knowledgeRegistry.create("takaro-docs");
    if (!kb) {
      console.warn("takaro-docs KB not registered, falling back to grok-fast without docs");
      return BASE_EXPERIMENTS["grok-fast"];
    }
    return {
      model: "x-ai/grok-code-fast-1",
      systemPrompt: SYSTEM_PROMPT_V1,
      tools: [...moduleWriterTools, kb.searchTool],
      temperature: 0.7,
      maxTokens: 8192,
      description: "Enhanced with Takaro documentation knowledge base for accurate API usage and best practices.",
    };
  }

  return undefined;
}

/**
 * List all available experiments.
 */
export function listExperiments(): string[] {
  return [...Object.keys(BASE_EXPERIMENTS), ...KB_ENHANCED_EXPERIMENTS];
}

// Legacy export for backwards compatibility
export const MODULE_WRITER_EXPERIMENTS = BASE_EXPERIMENTS;

export const DEFAULT_EXPERIMENT = "grok-fast";

// Keep legacy exports for backwards compatibility during migration
export const MODULE_WRITER_VERSIONS = MODULE_WRITER_EXPERIMENTS;
export const DEFAULT_VERSION = DEFAULT_EXPERIMENT;
