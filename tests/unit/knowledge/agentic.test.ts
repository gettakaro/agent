import { describe, it } from "node:test";
import assert from "node:assert";
import { researchTopic } from "../../../src/knowledge/retrieval/agentic.js";
import { createResearchTopicTool } from "../../../src/knowledge/tools/researchTopic.js";

/**
 * Tests for agentic research functionality.
 *
 * Note: These are lightweight tests that verify the API and basic structure.
 * Full end-to-end testing with real API calls is covered in integration tests.
 */

describe("Agentic research API", () => {
  it("should export researchTopic function", () => {
    assert.strictEqual(typeof researchTopic, "function", "researchTopic should be a function");
  });

  it("should export createResearchTopicTool function", () => {
    assert.strictEqual(
      typeof createResearchTopicTool,
      "function",
      "createResearchTopicTool should be a function",
    );
  });
});

describe("Research tool creation", () => {
  it("should create researchTopic tool with required options", () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
    });

    assert.strictEqual(tool.name, "researchTopic");
    assert.ok(tool.description.length > 0);
    assert.ok(tool.parameters);
    assert.strictEqual(typeof tool.execute, "function");
  });

  it("should include topic parameter in tool schema", () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
    });

    assert.ok(tool.parameters.properties);
    assert.ok(tool.parameters.properties.topic);
    assert.strictEqual(tool.parameters.properties.topic.type, "string");
    assert.ok(tool.parameters.required?.includes("topic"));
  });

  it("should include optional maxIterations parameter", () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
    });

    assert.ok(tool.parameters.properties);
    assert.ok(tool.parameters.properties.maxIterations);
    assert.strictEqual(tool.parameters.properties.maxIterations.type, "number");
    assert.strictEqual(tool.parameters.properties.maxIterations.minimum, 1);
    assert.strictEqual(tool.parameters.properties.maxIterations.maximum, 5);
  });

  it("should include optional minResults parameter", () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
    });

    assert.ok(tool.parameters.properties);
    assert.ok(tool.parameters.properties.minResults);
    assert.strictEqual(tool.parameters.properties.minResults.type, "number");
    assert.strictEqual(tool.parameters.properties.minResults.minimum, 5);
    assert.strictEqual(tool.parameters.properties.minResults.maximum, 30);
  });

  it("should use custom description when provided", () => {
    const customDescription = "Custom research description";
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
      description: customDescription,
    });

    assert.ok(tool.description.includes(customDescription));
  });

  it("should use custom maxIterations default", () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
      maxIterations: 5,
    });

    assert.strictEqual(tool.parameters.properties?.maxIterations?.default, 5);
  });

  it("should use custom minResults default", () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
      minResults: 20,
    });

    assert.strictEqual(tool.parameters.properties?.minResults?.default, 20);
  });

  it("should return error when topic is missing", async () => {
    const tool = createResearchTopicTool({
      knowledgeBaseId: "test-kb",
      knowledgeBaseName: "Test KB",
    });

    const result = await tool.execute({}, {
      conversationId: "test",
      agentId: "test-agent",
      agentVersion: "1.0.0",
      state: {},
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.output.includes("topic parameter is required"));
  });
});
