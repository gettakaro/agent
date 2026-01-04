#!/usr/bin/env tsx
/**
 * Test hybrid search functionality with various queries.
 * Verifies that the RAG architecture redesign is working correctly.
 */

import { retrieve } from "../src/knowledge/retrieval/index.js";
import type { Thoroughness } from "../src/knowledge/retrieval/types.js";

const TEST_QUERIES = [
  {
    query: "moduleControllerCreate",
    description: "Exact API name (should excel with keyword search)",
    expected: "Should find Module API documentation",
  },
  {
    query: "how do hooks work",
    description: "Natural language question (benefits from semantic search)",
    expected: "Should find Hooks Guide",
  },
  {
    query: "ban player with reason",
    description: "Mixed keywords and concepts",
    expected: "Should find Player Moderation Guide",
  },
  {
    query: "cronjobs schedule tasks",
    description: "Topic-based search",
    expected: "Should find CronJobs Guide",
  },
];

async function testSearch(query: string, thoroughness: Thoroughness) {
  const response = await retrieve("takaro-docs", query, {
    thoroughness,
    limit: 3,
  });

  return response;
}

async function main() {
  console.log("=".repeat(80));
  console.log("RAG HYBRID SEARCH TEST SUITE");
  console.log("=".repeat(80));
  console.log();

  for (const test of TEST_QUERIES) {
    console.log("-".repeat(80));
    console.log(`Query: "${test.query}"`);
    console.log(`Description: ${test.description}`);
    console.log(`Expected: ${test.expected}`);
    console.log();

    // Test all three thoroughness levels
    const modes: Thoroughness[] = ["fast", "balanced", "thorough"];

    for (const mode of modes) {
      console.log(`[${mode.toUpperCase()}] Searching...`);

      try {
        const response = await testSearch(test.query, mode);

        console.log(`  ⏱️  Latency: ${response.latencyMs}ms`);
        console.log(`  📊 Results: ${response.results.length}`);

        if (response.results.length > 0) {
          const top = response.results[0]!;
          console.log(`  🏆 Top result:`);
          console.log(`     Title: ${top.documentTitle}`);
          console.log(`     Section: ${top.sectionPath?.join(" > ") || "N/A"}`);
          console.log(`     Score: ${Math.round(top.score * 100)}%`);
          console.log(`     Preview: ${top.content.slice(0, 100)}...`);
        } else {
          console.log(`  ⚠️  No results found`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      }

      console.log();
    }
  }

  console.log("=".repeat(80));
  console.log("✅ Test suite complete!");
  console.log("=".repeat(80));

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
