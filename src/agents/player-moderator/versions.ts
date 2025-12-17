import type { AgentVersionConfig } from "../types.js";
import { SYSTEM_PROMPT_V1 } from "./prompts/v1.js";
import { playerModeratorTools } from "./tools/index.js";

export const PLAYER_MODERATOR_EXPERIMENTS: Record<string, AgentVersionConfig> = {
  default: {
    model: "x-ai/grok-code-fast-1",
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: playerModeratorTools,
    temperature: 0.5,
    maxTokens: 4096,
    description: "Manage players, bans, and roles. Investigate player activity and enforce server rules.",
  },
};

export const DEFAULT_EXPERIMENT = "default";
