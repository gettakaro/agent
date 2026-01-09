import type { LangfuseTraceClient } from "langfuse";
import type { Message, StreamChunk, ToolDefinition } from "../types.js";

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMProvider {
  chat(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[],
    options: ChatOptions,
    onChunk?: (chunk: StreamChunk) => void,
    langfuseTrace?: LangfuseTraceClient,
  ): Promise<ProviderResponse>;
}

export interface ProviderResponse {
  content: string;
  toolCalls: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: "end_turn" | "tool_use" | "max_tokens";
}
