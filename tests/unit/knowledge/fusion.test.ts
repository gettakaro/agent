import { describe, it } from "node:test";
import assert from "node:assert";
import { fuseRankedLists, normalizeScores } from "../../../src/knowledge/retrieval/fusion.js";

describe("Reciprocal Rank Fusion (RRF)", () => {
  it("should combine two ranked lists with RRF scores", () => {
    const list1 = [
      { id: "a", score: 0.9 },
      { id: "b", score: 0.7 },
    ];

    const list2 = [
      { id: "b", score: 8.5 },
      { id: "c", score: 6.2 },
    ];

    const fused = fuseRankedLists([list1, list2]);

    // Item 'b' appears in both lists, should have highest combined RRF score
    assert.strictEqual(fused[0]!.id, "b", "Item in both lists should rank highest");
    assert.ok(fused[0]!.score > fused[1]!.score, "Top result should have highest score");
    assert.strictEqual(fused.length, 3, "Should include all unique items");
  });

  it("should use k=60 constant for RRF calculation", () => {
    // RRF score = sum(1 / (k + rank)) where k=60
    // Use two lists to actually test RRF calculation
    const list1 = [{ id: "a", score: 1.0 }];
    const list2 = [{ id: "b", score: 1.0 }];
    const fused = fuseRankedLists([list1, list2]);

    // For rank 0 in single list: score = 1 / (60 + 0) = 1/60 ≈ 0.0167
    const expectedScore = 1 / 60;
    // Both items should have the same RRF score since both are rank 0 in their respective lists
    assert.ok(Math.abs(fused[0]!.score - expectedScore) < 0.0001, `Score should be ~${expectedScore}`);
    assert.ok(Math.abs(fused[1]!.score - expectedScore) < 0.0001, `Score should be ~${expectedScore}`);
  });

  it("should correctly calculate RRF for multiple appearances", () => {
    const list1 = [{ id: "a", score: 1.0 }, { id: "b", score: 0.5 }];
    const list2 = [{ id: "a", score: 1.0 }, { id: "c", score: 0.3 }];

    const fused = fuseRankedLists([list1, list2]);

    // Item 'a' appears at rank 0 in both lists
    // RRF score = 1/(60+0) + 1/(60+0) = 2/60 = 1/30 ≈ 0.0333
    const expectedScore = 2 / 60;
    assert.strictEqual(fused[0]!.id, "a");
    assert.ok(Math.abs(fused[0]!.score - expectedScore) < 0.0001);
  });

  it("should handle single list (no fusion needed)", () => {
    const list = [
      { id: "a", score: 0.9 },
      { id: "b", score: 0.7 },
      { id: "c", score: 0.5 },
    ];

    const fused = fuseRankedLists([list]);

    assert.strictEqual(fused.length, 3);
    assert.strictEqual(fused[0]!.id, "a");
    assert.strictEqual(fused[1]!.id, "b");
    assert.strictEqual(fused[2]!.id, "c");
  });

  it("should handle empty lists", () => {
    const fused = fuseRankedLists([]);
    assert.strictEqual(fused.length, 0);
  });

  it("should handle lists with no overlap", () => {
    const list1 = [{ id: "a", score: 1.0 }, { id: "b", score: 0.5 }];
    const list2 = [{ id: "c", score: 1.0 }, { id: "d", score: 0.5 }];

    const fused = fuseRankedLists([list1, list2]);

    assert.strictEqual(fused.length, 4);
    // All items should have equal RRF scores since same ranks
    assert.ok(Math.abs(fused[0]!.score - fused[1]!.score) < 0.0001);
  });

  it("should sort results by RRF score descending", () => {
    const list1 = [
      { id: "a", score: 1.0 },
      { id: "b", score: 0.5 },
      { id: "c", score: 0.3 },
    ];

    const list2 = [
      { id: "c", score: 1.0 },
      { id: "b", score: 0.8 },
      { id: "d", score: 0.5 },
    ];

    const fused = fuseRankedLists([list1, list2]);

    // Verify descending order
    for (let i = 0; i < fused.length - 1; i++) {
      assert.ok(fused[i]!.score >= fused[i + 1]!.score, "Results should be sorted by score descending");
    }
  });

  it("should preserve item properties", () => {
    interface TestItem {
      id: string;
      score: number;
      data?: string;
    }

    const list1: TestItem[] = [{ id: "a", score: 1.0, data: "test" }];
    const fused = fuseRankedLists([list1]);

    assert.strictEqual(fused[0]!.id, "a");
    assert.strictEqual((fused[0]! as TestItem).data, "test");
  });

  it("should handle very long lists efficiently", () => {
    // Create lists with 100 items each
    const list1 = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      score: 100 - i,
    }));

    const list2 = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i + 50}`,
      score: 100 - i,
    }));

    const fused = fuseRankedLists([list1, list2]);

    // Should have 150 unique items (50 overlap)
    assert.strictEqual(fused.length, 150);
    // Items in both lists should rank higher
    assert.ok(fused[0]!.id.startsWith("item-5"), "Overlapping items should rank high");
  });
});

describe("Score normalization", () => {
  it("should normalize scores to 0-1 range", () => {
    const items = [
      { id: "a", score: 10 },
      { id: "b", score: 5 },
      { id: "c", score: 0 },
    ];

    const normalized = normalizeScores(items);

    assert.strictEqual(normalized[0]!.score, 1.0); // Max score
    assert.strictEqual(normalized[1]!.score, 0.5); // Middle
    assert.strictEqual(normalized[2]!.score, 0.0); // Min score
  });

  it("should handle items with same scores", () => {
    const items = [
      { id: "a", score: 5 },
      { id: "b", score: 5 },
      { id: "c", score: 5 },
    ];

    const normalized = normalizeScores(items);

    // All scores same, no normalization needed
    assert.strictEqual(normalized[0]!.score, 5);
    assert.strictEqual(normalized[1]!.score, 5);
    assert.strictEqual(normalized[2]!.score, 5);
  });

  it("should handle empty array", () => {
    const normalized = normalizeScores([]);
    assert.strictEqual(normalized.length, 0);
  });

  it("should preserve item order", () => {
    const items = [
      { id: "a", score: 3 },
      { id: "b", score: 1 },
      { id: "c", score: 2 },
    ];

    const normalized = normalizeScores(items);

    assert.strictEqual(normalized[0]!.id, "a");
    assert.strictEqual(normalized[1]!.id, "b");
    assert.strictEqual(normalized[2]!.id, "c");
  });
});
