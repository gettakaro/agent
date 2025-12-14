import type { AgentVersionConfig } from '../types.js';
import { SYSTEM_PROMPT_V1 } from './prompts/v1.js';
import { moduleWriterTools } from './tools/index.js';

export const MODULE_WRITER_VERSIONS: Record<string, AgentVersionConfig> = {
  '1.0.0': {
    model: 'x-ai/grok-3-fast-beta',
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: moduleWriterTools,
    temperature: 0.7,
    maxTokens: 8192,
  },
};

export const DEFAULT_VERSION = '1.0.0';
