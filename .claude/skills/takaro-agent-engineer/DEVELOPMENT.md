# Development Workflow

## Quick Start

```bash
# Start everything
docker compose up

# Run migrations if needed
docker compose exec app npm run db:migrate
```

## Local Development (Alternative)

```bash
# Start only database services
docker compose up -d postgres redis

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start with hot-reload
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with tsx watch mode |
| `npm run build` | TypeScript compile + copy views/public |
| `npm run start` | Run compiled app |
| `npm run typecheck` | Type check without emitting |
| `npm run lint` | Check with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run db:migrate` | Run migrations |
| `npm run db:rollback` | Rollback last batch |

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://takaro:takaro@localhost:5433/takaro_agent

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3100

# Takaro API
TAKARO_API_URL=https://api.takaro.io
TAKARO_LOGIN_URL=https://dashboard.takaro.io/login
CORS_ORIGINS=https://ai.takaro.io,https://dashboard.takaro.io

# Service account auth (dev/testing)
TAKARO_USERNAME=
TAKARO_PASSWORD=
```

## Debugging Agent Behavior

### 1. Create test conversation

```bash
curl -s -X POST http://localhost:3100/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"agentId": "module-writer"}' | jq .
```

### 2. Send message and observe SSE stream

```bash
curl -N -X POST http://localhost:3100/api/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "your test prompt"}'
```

Events show:
- `tool_use` - Which tool called and with what input
- `tool_result` - Success/failure and output
- `text` - Agent's text response
- `done` - Token usage stats

### 3. Inspect full conversation

```bash
curl -s http://localhost:3100/api/conversations/{id}/messages | jq .
```

## Error Handling

Use `formatError()` from `src/utils/formatError.ts` when logging errors. Extracts readable info from Axios errors.

```typescript
import { formatError } from "../utils/formatError.js";

try {
  // ...
} catch (error) {
  console.error("Operation failed:", formatError(error));
}
```

## Production Docker Image

```bash
docker build -t takaro-agent .
```

## Testing Custom Agents Flow

```bash
# 1. Create custom agent
curl -X POST http://localhost:3100/api/custom-agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "systemPrompt": "You are a helpful assistant.",
    "tools": ["getGameServers"],
    "model": "anthropic/claude-sonnet-4"
  }'

# 2. Create conversation with custom agent
curl -X POST http://localhost:3100/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"agentId": "custom:AGENT_UUID"}'

# 3. Send message
curl -N -X POST http://localhost:3100/api/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message"}'
```

## Knowledge Base Testing

```bash
# List knowledge bases
curl http://localhost:3100/api/knowledge-bases | jq .

# Search
curl 'http://localhost:3100/api/knowledge-bases/takaro-docs/search?q=hook&limit=5' | jq .

# Trigger sync
curl -X POST http://localhost:3100/api/knowledge-bases/takaro-docs/sync | jq .
```

## Database Debugging

```bash
# Interactive shell
docker compose exec postgres psql -U takaro -d takaro_agent

# Quick queries
docker compose exec postgres psql -U takaro -d takaro_agent -c "SELECT COUNT(*) FROM conversations;"
docker compose exec postgres psql -U takaro -d takaro_agent -c "SELECT * FROM knex_migrations;"
```

## Redis Debugging

```bash
# Interactive shell
docker compose exec redis redis-cli

# Quick commands
docker compose exec redis redis-cli DBSIZE
docker compose exec redis redis-cli KEYS '*'
docker compose exec redis redis-cli ZCARD bull:kb-sync:failed
```

## Common Issues

**Database connection errors**
- Check PostgreSQL is running: `docker compose ps`
- Port 5433 (host) maps to 5432 (container)

**Migration extension errors**
- `npm run db:migrate` auto-detects `.ts` vs `.js`
- In Docker, runs as `.ts` via tsx
- In production (compiled), runs as `.js`

**Tool execution failures**
- Check `context.takaroClient` exists
- Review tool_result events in SSE stream for detailed errors
