import type { Message, StreamChunk, ToolDefinition } from "../types.js";
import type { ChatOptions, ILLMProvider, ProviderResponse } from "./types.js";

export interface MockResponse {
  content: string;
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  usage: { inputTokens: number; outputTokens: number };
  stopReason: "end_turn" | "tool_use" | "max_tokens";
  streamChunks?: Array<StreamChunk>; // Optional: for simulating streaming
}

export class MockLLMProvider implements ILLMProvider {
  private static instance: MockLLMProvider | null = null;
  private responseQueue: MockResponse[] = [];
  private callHistory: Array<{
    messages: Message[];
    systemPrompt: string;
    tools: ToolDefinition[];
    options: ChatOptions;
  }> = [];

  private constructor() {}

  static getInstance(): MockLLMProvider {
    if (!MockLLMProvider.instance) {
      MockLLMProvider.instance = new MockLLMProvider();
    }
    return MockLLMProvider.instance;
  }

  setResponses(responses: MockResponse[]): void {
    this.responseQueue = [...responses];
  }

  reset(): void {
    this.responseQueue = [];
    this.callHistory = [];
  }

  getCallHistory() {
    return [...this.callHistory];
  }

  async chat(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[],
    options: ChatOptions,
    onChunk?: (chunk: StreamChunk) => void,
  ): Promise<ProviderResponse> {
    this.callHistory.push({ messages: [...messages], systemPrompt, tools: [...tools], options });

    const response = this.responseQueue.shift();
    if (!response) {
      throw new Error("MockLLMProvider: No mock response configured. Call setResponses() first.");
    }

    if (onChunk && response.streamChunks) {
      for (const chunk of response.streamChunks) {
        onChunk(chunk);
      }
    } else if (onChunk) {
      if (response.content) {
        onChunk({ type: "text", content: response.content });
      }
      for (const toolCall of response.toolCalls) {
        onChunk({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input });
      }
    }

    return {
      content: response.content,
      toolCalls: response.toolCalls,
      usage: response.usage,
      stopReason: response.stopReason,
    };
  }
}
