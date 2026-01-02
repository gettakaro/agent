import type { ToolContext, ToolDefinition, ToolResult, AgentVersionConfig } from "../../src/agents/types.js";

export function createMockToolContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    conversationId: "conv_test_123",
    agentId: "module-writer",
    agentVersion: "test",
    state: {},
    userId: "user_test_456",
    openrouterApiKey: "test-api-key",
    ...overrides,
  };
}

export function createMockModule(overrides: Partial<MockModuleData> = {}): MockModuleData {
  return {
    id: "mod_123",
    name: "test-module",
    builtin: false,
    latestVersion: {
      id: "ver_456",
      description: "A test module for unit testing",
      configSchema: "{}",
      uiSchema: "{}",
      commands: [
        {
          id: "cmd_001",
          name: "test-command",
          trigger: "test",
          helpText: "A test command",
        },
      ],
      hooks: [
        {
          id: "hook_001",
          name: "onPlayerJoin",
          eventType: "player-connected",
          regex: ".*",
        },
      ],
      cronJobs: [
        {
          id: "cron_001",
          name: "daily-task",
          temporalValue: "0 0 * * *",
        },
      ],
      functions: [
        {
          id: "fn_001",
          name: "helperFunction",
        },
      ],
    },
    ...overrides,
  };
}

export function createMockTakaroClient(moduleData?: MockModuleData): MockTakaroClient {
  return {
    module: {
      moduleControllerGetOne: async (moduleId: string) => {
        if (!moduleData) {
          throw new Error(`Module not found: ${moduleId}`);
        }
        return {
          data: {
            data: moduleData,
          },
        };
      },
      moduleControllerCreate: async (input: { name: string; description?: string }) => {
        return {
          data: {
            data: {
              id: `mod_${Date.now()}`,
              name: input.name,
              builtin: false,
              latestVersion: {
                id: `ver_${Date.now()}`,
                description: input.description || "",
              },
            },
          },
        };
      },
    },
  } as MockTakaroClient;
}

export function createMockToolContextWithClient(
  moduleData?: MockModuleData,
  contextOverrides: Partial<ToolContext> = {},
): ToolContext {
  const mockClient = createMockTakaroClient(moduleData);
  return createMockToolContext({
    // biome-ignore lint/suspicious/noExplicitAny: Mock client doesn't need full type compliance
    takaroClient: mockClient as any,
    ...contextOverrides,
  });
}

export interface MockModuleData {
  id: string;
  name: string;
  builtin: boolean;
  latestVersion: {
    id: string;
    description: string;
    configSchema: string;
    uiSchema: string;
    commands?: Array<{
      id: string;
      name: string;
      trigger: string;
      helpText: string;
    }>;
    hooks?: Array<{
      id: string;
      name: string;
      eventType: string;
      regex: string;
    }>;
    cronJobs?: Array<{
      id: string;
      name: string;
      temporalValue: string;
    }>;
    functions?: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface MockTakaroClient {
  module: {
    moduleControllerGetOne: (moduleId: string) => Promise<{ data: { data: MockModuleData } }>;
    moduleControllerCreate: (input: {
      name: string;
      description?: string;
    }) => Promise<{ data: { data: Partial<MockModuleData> } }>;
  };
}

export function createTestTool(
  name: string,
  handler: (input: Record<string, unknown>) => ToolResult,
): ToolDefinition {
  return {
    name,
    description: `Test tool: ${name}`,
    parameters: { type: "object", properties: {} },
    execute: async (input: Record<string, unknown>, _context: ToolContext) => handler(input),
  };
}

export function createTestConfig(tools: ToolDefinition[] = []): AgentVersionConfig {
  return {
    model: "test-model",
    systemPrompt: "You are a test assistant.",
    tools,
    temperature: 0.7,
    maxTokens: 1000,
  };
}
