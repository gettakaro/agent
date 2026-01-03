import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import { setupTestDatabase, teardownTestDatabase, truncateTables, type TestDatabase } from "../setup.js";

describe("ConversationService", () => {
  let testDb: TestDatabase;
  let ConversationService: typeof import("../../../src/conversations/service.js").ConversationService;
  let service: InstanceType<typeof ConversationService>;

  before(async () => {
    testDb = await setupTestDatabase();
    const mod = await import("../../../src/conversations/service.js");
    ConversationService = mod.ConversationService;
    service = new ConversationService();
  });

  after(async () => {
    await teardownTestDatabase(testDb);
  });

  beforeEach(async () => {
    await truncateTables(testDb.knex);
  });

  it("should create a conversation", async () => {
    const conversation = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
      userId: "user_123",
      title: "Test Conversation",
    });

    assert.ok(conversation.id);
    assert.strictEqual(conversation.agentId, "module-writer");
    assert.strictEqual(conversation.agentVersion, "grok-fast");
    assert.strictEqual(conversation.userId, "user_123");
    assert.strictEqual(conversation.title, "Test Conversation");
    assert.strictEqual(conversation.provider, "openrouter");
    assert.deepStrictEqual(conversation.state, {});
    assert.ok(conversation.createdAt instanceof Date);
    assert.ok(conversation.updatedAt instanceof Date);
  });

  it("should get a conversation by id", async () => {
    const created = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
    });

    const retrieved = await service.get(created.id);

    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, created.id);
    assert.strictEqual(retrieved.agentId, "module-writer");
  });

  it("should return null for non-existent conversation", async () => {
    const retrieved = await service.get("00000000-0000-0000-0000-000000000000");
    assert.strictEqual(retrieved, null);
  });

  it("should add a message to conversation", async () => {
    const conversation = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
    });

    const message = await service.addMessage(conversation.id, {
      role: "user",
      content: "Create a module for me",
    });

    assert.ok(message.id);
    assert.strictEqual(message.conversationId, conversation.id);
    assert.strictEqual(message.role, "user");
    assert.strictEqual(message.content, "Create a module for me");
    assert.ok(message.createdAt instanceof Date);
  });

  it("should add message with tool executions", async () => {
    const conversation = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
    });

    const toolExecutions = [
      {
        id: "tool_001",
        name: "createModule",
        input: { name: "test-module" },
        result: { success: true, output: { moduleId: "mod_123" } },
        durationMs: 150,
      },
    ];

    const message = await service.addMessage(conversation.id, {
      role: "assistant",
      content: "I created the module",
      toolExecutions,
    });

    assert.deepStrictEqual(message.toolExecutions, toolExecutions);
  });

  it("should get messages in chronological order", async () => {
    const conversation = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
    });

    await service.addMessage(conversation.id, { role: "user", content: "First message" });
    await service.addMessage(conversation.id, { role: "assistant", content: "Second message" });
    await service.addMessage(conversation.id, { role: "user", content: "Third message" });

    const messages = await service.getMessages(conversation.id);

    assert.strictEqual(messages.length, 3);
    assert.strictEqual(messages[0].content, "First message");
    assert.strictEqual(messages[1].content, "Second message");
    assert.strictEqual(messages[2].content, "Third message");
  });

  it("should update conversation state", async () => {
    const conversation = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
    });

    await service.updateState(conversation.id, { moduleId: "mod_123", step: "building" });

    const updated = await service.get(conversation.id);
    assert.ok(updated);
    assert.deepStrictEqual(updated.state, { moduleId: "mod_123", step: "building" });
  });

  it("should delete conversation and cascade messages", async () => {
    const conversation = await service.create({
      agentId: "module-writer",
      agentVersion: "grok-fast",
    });

    await service.addMessage(conversation.id, { role: "user", content: "Test message" });

    await service.delete(conversation.id);

    const deleted = await service.get(conversation.id);
    assert.strictEqual(deleted, null);

    const messages = await service.getMessages(conversation.id);
    assert.strictEqual(messages.length, 0);
  });
});
