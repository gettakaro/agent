import type { MockResponse } from "../../src/agents/providers/MockLLMProvider.js";

export const simpleResponse: MockResponse = {
  content: "I understand. Let me help you with that.",
  toolCalls: [],
  usage: { inputTokens: 100, outputTokens: 25 },
  stopReason: "end_turn",
};

export const toolCallResponse: MockResponse = {
  content: "I'll create a module for you.",
  toolCalls: [
    {
      id: "tool_001",
      name: "createModule",
      input: { name: "test-module", description: "A test module" },
    },
  ],
  usage: { inputTokens: 150, outputTokens: 50 },
  stopReason: "tool_use",
};

export const multiToolResponse: MockResponse = {
  content: "Let me set up the module with a command and hook.",
  toolCalls: [
    {
      id: "tool_001",
      name: "createModule",
      input: { name: "advanced-module", description: "Module with components" },
    },
    {
      id: "tool_002",
      name: "addCommand",
      input: { name: "greet", trigger: "greet", helpText: "Greets a player" },
    },
    {
      id: "tool_003",
      name: "addHook",
      input: { name: "onJoin", eventType: "player-connected" },
    },
  ],
  usage: { inputTokens: 200, outputTokens: 100 },
  stopReason: "tool_use",
};

export const followUpResponse: MockResponse = {
  content: "The module has been created successfully! You can now install it on a game server.",
  toolCalls: [],
  usage: { inputTokens: 300, outputTokens: 40 },
  stopReason: "end_turn",
};

export const getModuleToolResponse: MockResponse = {
  content: "Let me retrieve the module details.",
  toolCalls: [
    {
      id: "tool_get_001",
      name: "getModule",
      input: { moduleId: "mod_123" },
    },
  ],
  usage: { inputTokens: 80, outputTokens: 30 },
  stopReason: "tool_use",
};

export function createModuleFlowResponses(): MockResponse[] {
  return [toolCallResponse, followUpResponse];
}

export function createTextResponse(content: string): MockResponse {
  return {
    content,
    toolCalls: [],
    usage: { inputTokens: 50, outputTokens: content.length / 4 },
    stopReason: "end_turn",
  };
}

export function createToolCallResponse(
  toolName: string,
  input: Record<string, unknown>,
  content = "",
): MockResponse {
  return {
    content,
    toolCalls: [
      {
        id: `tool_${Date.now()}`,
        name: toolName,
        input,
      },
    ],
    usage: { inputTokens: 100, outputTokens: 50 },
    stopReason: "tool_use",
  };
}
