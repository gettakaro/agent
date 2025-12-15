import type { AgentVersionConfig } from '../types.js';
import { SYSTEM_PROMPT_V1 } from './prompts/v1.js';
import { SYSTEM_PROMPT_CONCISE } from './prompts/concise.js';
import { moduleWriterTools } from './tools/index.js';

/**
 * Module writer experiments.
 *
 * Each key is an experiment name used in compound IDs:
 *   module-writer/grok-fast
 *   module-writer/gpt-oss
 *   module-writer/concise
 *
 * Once an experiment is proven, it can be promoted to stable:
 *   module-writer@1.0.0
 */
export const MODULE_WRITER_EXPERIMENTS: Record<string, AgentVersionConfig> = {
  'grok-fast': {
    model: 'x-ai/grok-code-fast-1',
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: moduleWriterTools,
    temperature: 0.7,
    maxTokens: 8192,
  },
  'gpt-oss': {
    model: 'openai/gpt-4.1-nano',
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: moduleWriterTools,
    temperature: 0.7,
    maxTokens: 8192,
  },
  'concise': {
    model: 'x-ai/grok-code-fast-1',
    systemPrompt: SYSTEM_PROMPT_CONCISE,
    tools: moduleWriterTools,
    temperature: 0.5,
    maxTokens: 4096,
  },
};

export const DEFAULT_EXPERIMENT = 'grok-fast';

// Keep legacy exports for backwards compatibility during migration
export const MODULE_WRITER_VERSIONS = MODULE_WRITER_EXPERIMENTS;
export const DEFAULT_VERSION = DEFAULT_EXPERIMENT;
