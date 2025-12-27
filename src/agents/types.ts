import type { Client } from "@takaro/apiclient";
import type { JSONSchema7 } from "json-schema";

// Message types
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolExecutions?: ToolExecution[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
}

// Tool execution record with timing metadata
export interface ToolExecution {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result: ToolResult;
  durationMs: number;
  startedAt: Date;
}

// Stream chunk types for real-time responses
export type StreamChunk =
  | { type: "text"; content: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; result: ToolResult; durationMs: number }
  | { type: "done"; usage: TokenUsage };

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Agent response after chat completes
export interface AgentResponse {
  messages: Message[];
  usage: TokenUsage;
  latencyMs: number;
}

export type LLMProvider = "openrouter";

// Tool context passed to tool execution
export interface ToolContext {
  conversationId: string;
  agentId: string;
  agentVersion: string;
  state: Record<string, unknown>;
  userId?: string;
  takaroClient?: Client;
  provider?: LLMProvider;
  openrouterApiKey: string;
}

// Tool definition - model agnostic
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema7;
  /** Internal variant identifier for A/B testing. Not exposed to LLM. */
  variant?: string;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

// Agent version configuration
export interface AgentVersionConfig {
  model: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  description?: string;
}

// Agent interface
export interface IAgent {
  readonly id: string;
  readonly version: string;
  readonly config: AgentVersionConfig;

  chat(messages: Message[], context: ToolContext, onChunk?: (chunk: StreamChunk) => void): Promise<AgentResponse>;
}

// Agent factory interface
export interface IAgentFactory {
  readonly agentId: string;
  createAgent(version: string): IAgent;
  listVersions(): string[];
  getDefaultVersion(): string;
}
