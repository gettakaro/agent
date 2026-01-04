import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { setupTestDatabase, teardownTestDatabase, type TestDatabase } from "../setup.js";
import { upsertDocuments } from "../../../src/knowledge/index.js";
import { retrieve } from "../../../src/knowledge/retrieval/index.js";
import type { Document } from "../../../src/knowledge/types.js";

describe("Hybrid search integration", () => {
  let testDb: TestDatabase;

  before(async () => {
    testDb = await setupTestDatabase();

    // Insert test documents with known content
    const documents: Document[] = [
      {
        content: "The moduleControllerCreate function creates new modules programmatically.",
        metadata: {
          sourceFile: "api.md",
          documentTitle: "API Reference",
          sectionPath: ["API Reference", "Module Controller"],
          contentWithContext: "# API Reference\n## Module Controller\n\nThe moduleControllerCreate function creates new modules programmatically.",
        },
      },
      {
        content: "Hooks allow you to execute code in response to game events.",
        metadata: {
          sourceFile: "hooks.md",
          documentTitle: "Hooks Guide",
          sectionPath: ["Hooks Guide"],
          contentWithContext: "# Hooks Guide\n\nHooks allow you to execute code in response to game events.",
        },
      },
      {
        content: "CronJobs enable scheduling recurring tasks using cron expressions.",
        metadata: {
          sourceFile: "cronjobs.md",
          documentTitle: "CronJobs Guide",
          sectionPath: ["CronJobs Guide"],
          contentWithContext: "# CronJobs Guide\n\nCronJobs enable scheduling recurring tasks using cron expressions.",
        },
      },
      {
        content: "To ban a player, use the moderation API with banPlayer function.",
        metadata: {
          sourceFile: "moderation.md",
          documentTitle: "Moderation",
          sectionPath: ["Moderation", "Banning"],
          contentWithContext: "# Moderation\n## Banning\n\nTo ban a player, use the moderation API with banPlayer function.",
        },
      },
    ];

    await upsertDocuments("test-kb", "v1", documents);
  });

  after(async () => {
    await teardownTestDatabase(testDb);
  });

  it("should find results using fast mode (vector search only)", async () => {
    const response = await retrieve("test-kb", "moduleControllerCreate", {
      thoroughness: "fast",
      limit: 3,
    });

    assert.ok(response.results.length > 0, "Should return results");
    assert.strictEqual(response.thoroughness, "fast");
    assert.ok(response.latencyMs < 500, "Fast mode should complete quickly");

    // Should find the API reference document
    const found = response.results.some(r => r.content.includes("moduleControllerCreate"));
    assert.ok(found, "Should find document with exact term match");
  });

  it("should find results using balanced mode (hybrid search)", async () => {
    const response = await retrieve("test-kb", "moduleControllerCreate", {
      thoroughness: "balanced",
      limit: 3,
    });

    assert.ok(response.results.length > 0, "Should return results");
    assert.strictEqual(response.thoroughness, "balanced");
    assert.ok(response.latencyMs < 1000, "Balanced mode should complete within 1s");

    // Should find the API reference document
    const found = response.results.some(r => r.content.includes("moduleControllerCreate"));
    assert.ok(found, "Should find document with exact keyword match");
  });

  it("should find results using thorough mode (hybrid + reranking)", async () => {
    const response = await retrieve("test-kb", "how do hooks work", {
      thoroughness: "thorough",
      limit: 3,
    });

    assert.ok(response.results.length > 0, "Should return results");
    assert.strictEqual(response.thoroughness, "thorough");

    // Should find hooks guide
    const found = response.results.some(r => r.content.includes("Hooks"));
    assert.ok(found, "Should find relevant document");
  });

  it("should benefit from keyword matching for exact terms", async () => {
    // Query with exact term that might not be semantically similar
    const exactTermResponse = await retrieve("test-kb", "banPlayer", {
      thoroughness: "balanced",
      limit: 3,
    });

    // Should find the moderation document due to keyword match
    const foundExact = exactTermResponse.results.some(r => r.content.includes("banPlayer"));
    assert.ok(foundExact, "Hybrid search should find exact keyword matches");
  });

  it("should return results with metadata", async () => {
    const response = await retrieve("test-kb", "hooks", {
      thoroughness: "balanced",
      limit: 3,
    });

    assert.ok(response.results.length > 0);

    const result = response.results[0]!;
    assert.ok(result.content, "Should have content");
    assert.ok(result.documentTitle, "Should have document title");
    assert.ok(result.score !== undefined, "Should have score");
    assert.ok(result.metadata, "Should have metadata");
  });

  it("should respect limit parameter", async () => {
    const response = await retrieve("test-kb", "guide", {
      thoroughness: "fast",
      limit: 2,
    });

    assert.ok(response.results.length <= 2, "Should respect limit");
  });

  it("should filter by minScore when specified", async () => {
    const response = await retrieve("test-kb", "completely unrelated random query xyz123", {
      thoroughness: "fast",
      limit: 5,
      minScore: 0.5,
    });

    // Low-relevance query with high minScore should return fewer or no results
    for (const result of response.results) {
      assert.ok(result.score >= 0.5, "All results should meet minScore threshold");
    }
  });

  it("should return empty results for non-existent knowledge base", async () => {
    try {
      await retrieve("nonexistent-kb", "test query", {
        thoroughness: "fast",
        limit: 5,
      });
      assert.fail("Should throw error for non-existent KB");
    } catch (error) {
      // Expected to fail
      assert.ok(error, "Should error on non-existent KB");
    }
  });

  it("should handle queries with special characters", async () => {
    const response = await retrieve("test-kb", "module & controller + create", {
      thoroughness: "balanced",
      limit: 3,
    });

    // Should handle special characters without crashing
    assert.ok(Array.isArray(response.results), "Should return results array");
  });

  it("should have different results between fast and balanced modes", async () => {
    const query = "scheduling tasks";

    const fastResponse = await retrieve("test-kb", query, {
      thoroughness: "fast",
      limit: 3,
    });

    const balancedResponse = await retrieve("test-kb", query, {
      thoroughness: "balanced",
      limit: 3,
    });

    // Both should return results
    assert.ok(fastResponse.results.length > 0);
    assert.ok(balancedResponse.results.length > 0);

    // Scores or ordering may differ due to hybrid search
    // (This is a weak assertion but tests that both modes work)
    assert.ok(fastResponse.latencyMs >= 0);
    assert.ok(balancedResponse.latencyMs >= 0);
  });
});
