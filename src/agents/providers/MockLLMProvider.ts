import type { LangfuseTraceClient } from "langfuse";
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
  private useFallbackResponse = false;

  private constructor() {}

  /**
   * Default fallback response used when queue is exhausted and fallback mode is enabled.
   * Used by E2E tests to provide deterministic responses without explicit setup.
   */
  private static readonly DEFAULT_RESPONSE: MockResponse = {
    content: "Hello! I'm the mock assistant. I received your message and I'm here to help. How can I assist you today?",
    toolCalls: [],
    usage: { inputTokens: 50, outputTokens: 30 },
    stopReason: "end_turn",
  };

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
    this.useFallbackResponse = false;
  }

  /**
   * Enable fallback mode - when response queue is exhausted, return a default response
   * instead of throwing an error. Useful for E2E tests that don't need precise control.
   */
  enableFallbackResponse(): void {
    this.useFallbackResponse = true;
  }

  /**
   * Disable fallback mode - throw error when response queue is exhausted.
   * This is the default behavior for unit/integration tests.
   */
  disableFallbackResponse(): void {
    this.useFallbackResponse = false;
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
    langfuseTrace?: LangfuseTraceClient,
  ): Promise<ProviderResponse> {
    this.callHistory.push({ messages: [...messages], systemPrompt, tools: [...tools], options });

    let response = this.responseQueue.shift();
    if (!response) {
      if (this.useFallbackResponse) {
        response = { ...MockLLMProvider.DEFAULT_RESPONSE };
      } else {
        throw new Error("MockLLMProvider: No mock response configured. Call setResponses() first.");
      }
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
