import { createApp } from './http/app.js';
import { config } from './config.js';
import { agentRegistry } from './agents/registry.js';
import { ModuleWriterFactory } from './agents/module-writer/index.js';
import { getDb, closeDb } from './db/connection.js';

async function main() {
  console.log('Starting Takaro Agent service...');

  // Register agents
  agentRegistry.register(new ModuleWriterFactory());
  console.log(`Registered agents: ${agentRegistry.listAgents().join(', ')}`);

  // Test database connection
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    console.log('Database connection established');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  // Create and start Express app
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /conversations');
    console.log('  POST /conversations');
    console.log('  GET  /conversations/:id');
    console.log('  DELETE /conversations/:id');
    console.log('  GET  /conversations/:id/messages');
    console.log('  POST /conversations/:id/messages (SSE)');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await closeDb();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
