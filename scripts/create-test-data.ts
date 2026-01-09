#!/usr/bin/env tsx
/**
 * Create test documents to verify hybrid search functionality.
 */

import { chunkText } from "../src/knowledge/ingest/chunker.js";
import { upsertDocuments } from "../src/knowledge/index.js";
import type { Document } from "../src/knowledge/types.js";

const TEST_DOCS = [
  {
    path: "api/modules.md",
    content: `# Module API Reference

## Overview

The Takaro module system allows you to create custom functionality for your game servers.

## moduleControllerCreate

Creates a new module with the given configuration. This is the primary method for creating modules programmatically.

### Parameters

- \`name\`: The module name (required)
- \`description\`: Module description (optional)
- \`commands\`: Array of command definitions (optional)
- \`hooks\`: Array of hook definitions (optional)

### Example

\`\`\`javascript
const module = await moduleControllerCreate({
  name: "MyModule",
  description: "A custom module",
  commands: [{
    name: "hello",
    function: "sayHello"
  }]
});
\`\`\`

## moduleControllerUpdate

Updates an existing module configuration.

## moduleControllerDelete

Deletes a module by ID.
`,
  },
  {
    path: "guides/hooks.md",
    content: `# Hooks Guide

## Introduction

Hooks allow you to execute code in response to game events.

## Player Events

### hook.player.connected

Triggered when a player joins the server. Use this hook to welcome players, check bans, or initialize player data.

Example:
\`\`\`javascript
async function onPlayerConnected(player) {
  await takaro.chat.send(\`Welcome \${player.name}!\`);
}
\`\`\`

### hook.player.disconnected

Triggered when a player leaves the server.

## Command Events

### hook.command.executed

Triggered after a command is successfully executed.
`,
  },
  {
    path: "guides/cronjobs.md",
    content: `# CronJobs Guide

## How Cronjobs Work

Cronjobs in Takaro allow you to schedule recurring tasks using cron expressions.

## Creating a Cronjob

Use the \`addCronJob\` method to create a new cronjob:

\`\`\`javascript
await addCronJob({
  name: "dailyRestart",
  temporalValue: "0 4 * * *",  // Run at 4 AM daily
  function: "restartServer"
});
\`\`\`

## Cron Expression Format

The temporal value uses standard cron syntax:
- Minute (0-59)
- Hour (0-23)
- Day of month (1-31)
- Month (1-12)
- Day of week (0-6)

## Best Practices

- Keep cronjob functions lightweight
- Use appropriate scheduling to avoid overlap
- Test cronjobs thoroughly before deploying
`,
  },
  {
    path: "guides/banning.md",
    content: `# Player Moderation Guide

## Banning Players

To ban a player from your server, use the moderation tools in the Takaro dashboard or API.

### Using the API

\`\`\`javascript
await takaro.moderation.banPlayer({
  playerId: player.id,
  reason: "Cheating detected",
  expiresAt: "2024-12-31T23:59:59Z"  // Optional
});
\`\`\`

### Ban Reasons

Always provide a clear reason when banning players. Common reasons:
- Cheating / Hacking
- Toxic behavior
- Griefing
- Spam

### Temporary vs Permanent Bans

- Set \`expiresAt\` for temporary bans
- Omit \`expiresAt\` for permanent bans

## Unbanning Players

\`\`\`javascript
await takaro.moderation.unbanPlayer(playerId);
\`\`\`
`,
  },
];

async function main() {
  console.log("Creating test documents with contextual metadata...\n");

  for (const doc of TEST_DOCS) {
    console.log(`Processing ${doc.path}...`);

    // Chunk with contextual metadata extraction
    const chunks = chunkText(doc.content, doc.path, {
      chunkSize: 500,
      overlap: 100,
    });

    console.log(`  Created ${chunks.length} chunks`);
    console.log(`  Document title: ${chunks[0]?.metadata.documentTitle || "N/A"}`);
    console.log(`  Section path: ${chunks[0]?.metadata.sectionPath?.join(" > ") || "N/A"}`);

    // Convert to documents with metadata
    const documents: Document[] = chunks.map((chunk) => ({
      content: chunk.content,
      metadata: {
        ...chunk.metadata,
        contentWithContext: chunk.contentWithContext,
        documentTitle: chunk.metadata.documentTitle,
        sectionPath: chunk.metadata.sectionPath,
      },
    }));

    await upsertDocuments("takaro-docs", "latest", documents);
    console.log(`  ✅ Ingested\n`);
  }

  console.log("✅ All test documents created!");
  console.log("\nYou can now test hybrid search with queries like:");
  console.log('  - "moduleControllerCreate"');
  console.log('  - "how do hooks work"');
  console.log('  - "ban player with reason"');
  console.log('  - "cronjobs schedule tasks"');

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
