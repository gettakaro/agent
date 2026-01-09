import { ModuleWriterFactory } from "./agents/module-writer/index.js";
import { PlayerModeratorFactory } from "./agents/player-moderator/index.js";
import { agentRegistry } from "./agents/registry.js";
import { config } from "./config.js";
import { closeDb, getDb } from "./db/connection.js";
import { createApp } from "./http/app.js";
import {
  closeRedisConnection as closeKBRedis,
  closeSyncQueue,
  knowledgeRegistry,
  scheduleKBSyncJobs,
  startSyncWorker,
} from "./knowledge/index.js";
import { TakaroDocsFactory } from "./knowledge/takaro-docs/index.js";
import { initializeLangfuse, shutdownLangfuse } from "./langfuse-client.js";
import { closeRedis, initRedis } from "./redis/client.js";
import { initServiceClient } from "./takaro/client.js";

async function main() {
  console.log("Starting Takaro Agent service");

  // Initialize Takaro client (service account mode if credentials provided)
  await initServiceClient();

  // Initialize Langfuse SDK for LLM tracing
  initializeLangfuse();

  // Register agents
  agentRegistry.register(new ModuleWriterFactory());
  agentRegistry.register(new PlayerModeratorFactory());
  console.log(`Registered agents: ${agentRegistry.listAgents().join(", ")}`);

  // Register knowledge bases
  knowledgeRegistry.register(new TakaroDocsFactory());
  console.log(`Registered knowledge bases: ${knowledgeRegistry.listKnowledgeBases().join(", ")}`);

  // Test database connection
  try {
    const db = getDb();
    await db.raw("SELECT 1");
    console.log("Database connection established");
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }

  // Initialize Redis
  try {
    await initRedis();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }

  // Start KB sync worker and schedule sync jobs
  const kbWorker = startSyncWorker();
  console.log("KB sync worker started");

  await scheduleKBSyncJobs();

  // Create and start Express app
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log("Available endpoints:");
    console.log("  GET  /health");
    console.log("  GET  /conversations");
    console.log("  POST /conversations");
    console.log("  GET  /conversations/:id");
    console.log("  DELETE /conversations/:id");
    console.log("  GET  /conversations/:id/messages");
    console.log("  POST /conversations/:id/messages (SSE)");
    console.log("  GET  /auth/me");
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await shutdownLangfuse();
    await kbWorker.close();
    await closeSyncQueue();
    await closeKBRedis();
    await closeRedis();
    await closeDb();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
