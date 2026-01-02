import { after, before, describe, it } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import supertest from "supertest";
import type { Express } from "express";

// Types for dynamic imports
import type { TestDatabase } from "../setup.js";
import type { TestUser } from "../../helpers/test-app.js";

// Generate a valid but non-existent UUID
const nonExistentId = crypto.randomUUID();

describe("Conversations API", () => {
  let db: TestDatabase;
  let app: Express;
  let agent: supertest.Agent;
  let user: TestUser;
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic import type
  let conversationService: any;

  before(async () => {
    // Import setup first - it sets env vars before config is loaded
    const { setupTestDatabase } = await import("../setup.js");
    db = await setupTestDatabase();

    // Now config has been loaded with correct env vars, safe to import app helpers
    const { createTestApp, createTestUser } = await import("../../helpers/test-app.js");
    const { ConversationService } = await import("../../../src/conversations/service.js");

    // Register agents (normally done in main.ts)
    const { agentRegistry } = await import("../../../src/agents/registry.js");
    const { ModuleWriterFactory } = await import("../../../src/agents/module-writer/index.js");
    agentRegistry.register(new ModuleWriterFactory());

    user = createTestUser({ id: "user_api_test_123" });
    app = createTestApp({ user });
    agent = supertest.agent(app);
    conversationService = new ConversationService();
  });

  after(async () => {
    const { teardownTestDatabase } = await import("../setup.js");
    await teardownTestDatabase(db);
  });

  describe("POST /api/conversations", () => {
    it("should create conversation with valid agentId", async () => {
      const res = await agent.post("/api/conversations").send({ agentId: "module-writer" }).expect(200);

      assert.ok(res.body.data);
      assert.ok(res.body.data.id);
      assert.strictEqual(res.body.data.agentId, "module-writer");
      assert.strictEqual(res.body.data.userId, user.id);
    });

    it("should return 400 when agentId is missing", async () => {
      const res = await agent.post("/api/conversations").send({}).expect(400);

      assert.strictEqual(res.body.error, "Validation failed");
      assert.ok(res.body.details.agentId);
    });

    it("should return 400 when agentId is empty string", async () => {
      const res = await agent.post("/api/conversations").send({ agentId: "" }).expect(400);

      assert.strictEqual(res.body.error, "Validation failed");
      assert.ok(res.body.details.agentId);
    });

    it("should return 400 when agentId is invalid", async () => {
      const res = await agent.post("/api/conversations").send({ agentId: "nonexistent-agent" }).expect(400);

      assert.ok(res.body.error.includes("Unknown agent"));
      assert.ok(res.body.error.includes("Available:"));
    });
  });

  describe("GET /api/conversations/:id", () => {
    it("should return conversation when found", async () => {
      // Create a conversation first
      const created = await conversationService.create({
        agentId: "module-writer",
        agentVersion: "default",
        userId: user.id,
        provider: "openrouter",
      });

      const res = await agent.get(`/api/conversations/${created.id}`).expect(200);

      assert.ok(res.body.data);
      assert.strictEqual(res.body.data.id, created.id);
      assert.strictEqual(res.body.data.agentId, "module-writer");
    });

    it("should return 404 when conversation not found", async () => {
      const res = await agent.get(`/api/conversations/${nonExistentId}`).expect(404);

      assert.strictEqual(res.body.error, "Conversation not found");
    });

    it("should return 403 when user does not own conversation", async () => {
      // Create conversation owned by different user
      const created = await conversationService.create({
        agentId: "module-writer",
        agentVersion: "default",
        userId: "other_user_456",
        provider: "openrouter",
      });

      const res = await agent.get(`/api/conversations/${created.id}`).expect(403);

      assert.strictEqual(res.body.error, "Forbidden");
    });
  });

  describe("POST /api/conversations/:id/messages", () => {
    it("should return 400 when content is missing", async () => {
      // Create a conversation first
      const created = await conversationService.create({
        agentId: "module-writer",
        agentVersion: "default",
        userId: user.id,
        provider: "openrouter",
      });

      const res = await agent.post(`/api/conversations/${created.id}/messages`).send({}).expect(400);

      assert.strictEqual(res.body.error, "Validation failed");
      assert.ok(res.body.details.content);
    });

    it("should return 400 when content is empty string", async () => {
      const created = await conversationService.create({
        agentId: "module-writer",
        agentVersion: "default",
        userId: user.id,
        provider: "openrouter",
      });

      const res = await agent.post(`/api/conversations/${created.id}/messages`).send({ content: "" }).expect(400);

      assert.strictEqual(res.body.error, "Validation failed");
      assert.ok(res.body.details.content);
    });

    it("should return 404 when conversation not found", async () => {
      const res = await agent
        .post(`/api/conversations/${nonExistentId}/messages`)
        .send({ content: "Hello" })
        .expect(404);

      assert.strictEqual(res.body.error, "Conversation not found");
    });

    it("should return 403 when user does not own conversation", async () => {
      // Create conversation owned by different user
      const created = await conversationService.create({
        agentId: "module-writer",
        agentVersion: "default",
        userId: "other_user_789",
        provider: "openrouter",
      });

      const res = await agent
        .post(`/api/conversations/${created.id}/messages`)
        .send({ content: "Hello" })
        .expect(403);

      assert.strictEqual(res.body.error, "Forbidden");
    });

    // Note: SSE success test is complex because it requires mocking the agent
    // and handling streaming response. The E2E tests cover this flow.
  });

  describe("Unauthenticated requests", () => {
    it("should return 401 when not authenticated", async () => {
      const { createTestApp } = await import("../../helpers/test-app.js");
      const unauthApp = createTestApp(); // No user = unauthenticated
      const unauthAgent = supertest.agent(unauthApp);

      const res = await unauthAgent.get("/api/conversations").expect(401);

      assert.strictEqual(res.body.error, "Not authenticated");
    });
  });
});
