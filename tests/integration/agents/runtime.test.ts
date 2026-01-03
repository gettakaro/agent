import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { setupTestDatabase, teardownTestDatabase, truncateTables, type TestDatabase } from "../setup.js";
import { createTestTool, createTestConfig } from "../../fixtures/test-data.js";
import type { ToolContext } from "../../../src/agents/types.js";

describe("AgentRuntime integration", () => {
  let testDb: TestDatabase;
  let MockLLMProvider: typeof import("../../../src/agents/providers/MockLLMProvider.js").MockLLMProvider;
  let AgentRuntime: typeof import("../../../src/agents/AgentRuntime.js").AgentRuntime;
  let ConversationService: typeof import("../../../src/conversations/service.js").ConversationService;

  before(async () => {
    testDb = await setupTestDatabase();
    const mockMod = await import("../../../src/agents/providers/MockLLMProvider.js");
    MockLLMProvider = mockMod.MockLLMProvider;
    const runtimeMod = await import("../../../src/agents/AgentRuntime.js");
    AgentRuntime = runtimeMod.AgentRuntime;
    const serviceMod = await import("../../../src/conversations/service.js");
    ConversationService = serviceMod.ConversationService;
  });

  after(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    await truncateTables(testDb.knex);
    MockLLMProvider.getInstance().reset();
  });

  it("should complete simple conversation without tools", async () => {
    const service = new ConversationService();
    const conversation = await service.create({
      agentId: "test-agent",
      agentVersion: "v1",
    });

    MockLLMProvider.getInstance().setResponses([
      {
        content: "Hello! How can I help you today?",
        toolCalls: [],
        usage: { inputTokens: 50, outputTokens: 20 },
        stopReason: "end_turn",
      },
    ]);

    const config = createTestConfig();
    const agent = new AgentRuntime("test-agent", "v1", config);

    await service.addMessage(conversation.id, { role: "user", content: "Hello" });
    const messages = await service.getMessages(conversation.id);

    const context: ToolContext = {
      conversationId: conversation.id,
      agentId: "test-agent",
      agentVersion: "v1",
      state: {},
      openrouterApiKey: "test-key",
    };

    const response = await agent.chat(messages, context);

    assert.strictEqual(response.messages.length, 1);
    assert.strictEqual(response.messages[0].role, "assistant");
    assert.strictEqual(response.messages[0].content, "Hello! How can I help you today?");
    assert.strictEqual(response.usage.inputTokens, 50);
    assert.strictEqual(response.usage.outputTokens, 20);

    for (const msg of response.messages) {
      await service.addMessage(conversation.id, msg);
    }

    const allMessages = await service.getMessages(conversation.id);
    assert.strictEqual(allMessages.length, 2);
    assert.strictEqual(allMessages[0].content, "Hello");
    assert.strictEqual(allMessages[1].content, "Hello! How can I help you today?");
  });

  it("should execute tool call and return final response", async () => {
    const service = new ConversationService();
    const conversation = await service.create({
      agentId: "test-agent",
      agentVersion: "v1",
    });

    let toolExecuted = false;
    const testTool = createTestTool("testTool", (input) => {
      toolExecuted = true;
      return { success: true, output: { result: `Processed: ${input.value}` } };
    });

    MockLLMProvider.getInstance().setResponses([
      {
        content: "I'll run the test tool.",
        toolCalls: [{ id: "tool_001", name: "testTool", input: { value: "test-input" } }],
        usage: { inputTokens: 100, outputTokens: 50 },
        stopReason: "tool_use",
      },
      {
        content: "The tool completed successfully!",
        toolCalls: [],
        usage: { inputTokens: 150, outputTokens: 30 },
        stopReason: "end_turn",
      },
    ]);

    const config = createTestConfig([testTool]);
    const agent = new AgentRuntime("test-agent", "v1", config);

    await service.addMessage(conversation.id, { role: "user", content: "Run the test tool" });
    const messages = await service.getMessages(conversation.id);

    const context: ToolContext = {
      conversationId: conversation.id,
      agentId: "test-agent",
      agentVersion: "v1",
      state: {},
      openrouterApiKey: "test-key",
    };

    const response = await agent.chat(messages, context);

    assert.ok(toolExecuted, "Tool should have been executed");
    assert.strictEqual(response.messages.length, 2);

    const toolMessage = response.messages[0];
    assert.strictEqual(toolMessage.content, "I'll run the test tool.");
    assert.ok(toolMessage.toolExecutions);
    assert.strictEqual(toolMessage.toolExecutions.length, 1);
    assert.strictEqual(toolMessage.toolExecutions[0].name, "testTool");
    assert.strictEqual(toolMessage.toolExecutions[0].result.success, true);

    const finalMessage = response.messages[1];
    assert.strictEqual(finalMessage.content, "The tool completed successfully!");

    assert.strictEqual(response.usage.inputTokens, 250);
    assert.strictEqual(response.usage.outputTokens, 80);
  });

  it("should persist tool executions in database", async () => {
    const service = new ConversationService();
    const conversation = await service.create({
      agentId: "test-agent",
      agentVersion: "v1",
    });

    const testTool = createTestTool("createModule", () => ({
      success: true,
      output: { moduleId: "mod_123" },
    }));

    MockLLMProvider.getInstance().setResponses([
      {
        content: "Creating module...",
        toolCalls: [{ id: "tool_001", name: "createModule", input: { name: "test-module" } }],
        usage: { inputTokens: 100, outputTokens: 50 },
        stopReason: "tool_use",
      },
      {
        content: "Module created!",
        toolCalls: [],
        usage: { inputTokens: 150, outputTokens: 20 },
        stopReason: "end_turn",
      },
    ]);

    const config = createTestConfig([testTool]);
    const agent = new AgentRuntime("test-agent", "v1", config);

    await service.addMessage(conversation.id, { role: "user", content: "Create a module" });
    const messages = await service.getMessages(conversation.id);

    const context: ToolContext = {
      conversationId: conversation.id,
      agentId: "test-agent",
      agentVersion: "v1",
      state: {},
      openrouterApiKey: "test-key",
    };

    const response = await agent.chat(messages, context);

    for (const msg of response.messages) {
      await service.addMessage(conversation.id, msg);
    }

    const records = await service.getMessageRecords(conversation.id);
    assert.strictEqual(records.length, 3);

    const assistantRecord = records[1];
    assert.strictEqual(assistantRecord.role, "assistant");
    assert.ok(assistantRecord.toolExecutions);
    assert.strictEqual(assistantRecord.toolExecutions[0].name, "createModule");
    assert.deepStrictEqual(assistantRecord.toolExecutions[0].result.output, { moduleId: "mod_123" });
  });

  it("should update context state during conversation", async () => {
    const service = new ConversationService();
    const conversation = await service.create({
      agentId: "test-agent",
      agentVersion: "v1",
    });

    const testTool = createTestTool("setState", (input) => {
      return { success: true, output: { key: input.key, value: input.value } };
    });

    testTool.execute = async (input: Record<string, unknown>, ctx: ToolContext) => {
      ctx.state[input.key as string] = input.value;
      return { success: true, output: { updated: true } };
    };

    MockLLMProvider.getInstance().setResponses([
      {
        content: "Setting state...",
        toolCalls: [{ id: "tool_001", name: "setState", input: { key: "moduleId", value: "mod_456" } }],
        usage: { inputTokens: 100, outputTokens: 50 },
        stopReason: "tool_use",
      },
      {
        content: "State updated!",
        toolCalls: [],
        usage: { inputTokens: 150, outputTokens: 20 },
        stopReason: "end_turn",
      },
    ]);

    const config = createTestConfig([testTool]);
    const agent = new AgentRuntime("test-agent", "v1", config);

    await service.addMessage(conversation.id, { role: "user", content: "Set some state" });
    const messages = await service.getMessages(conversation.id);

    const context: ToolContext = {
      conversationId: conversation.id,
      agentId: "test-agent",
      agentVersion: "v1",
      state: {},
      openrouterApiKey: "test-key",
    };

    await agent.chat(messages, context);

    assert.strictEqual(context.state.moduleId, "mod_456");

    await service.updateState(conversation.id, context.state);
    const updated = await service.get(conversation.id);
    assert.ok(updated);
    assert.strictEqual(updated.state.moduleId, "mod_456");
  });
});
