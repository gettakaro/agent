#!/usr/bin/env tsx
/**
 * Manually trigger a full re-sync of the takaro-docs knowledge base.
 * This will re-ingest all documents with the new contextual metadata.
 */

import { ingestFromGitHub } from "../src/knowledge/index.js";

const GITHUB_SOURCE = "https://github.com/gettakaro/takaro/tree/development/packages/web-docs/docs";

async function main() {
  console.log("Starting manual sync of takaro-docs...");

  const result = await ingestFromGitHub(
    "takaro-docs",
    "latest",
    GITHUB_SOURCE,
    {
      extensions: [".md", ".txt"],
      chunkSize: 1000,
      overlap: 200,
      replaceExisting: true,
    }
  );

  console.log(`✅ Sync complete!`);
  console.log(`   Documents processed: ${result.documentsProcessed}`);
  console.log(`   Chunks created: ${result.chunksCreated}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Sync failed:", error);
  process.exit(1);
});
