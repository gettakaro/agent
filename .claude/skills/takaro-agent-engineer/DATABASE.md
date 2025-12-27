# Database

PostgreSQL 16 with pgvector extension. Redis for BullMQ job queues.

## Tables

| Table | Description |
|-------|-------------|
| `conversations` | Chat sessions with agents. Stores agent_id, state (JSON), user_id, title |
| `messages` | Individual messages with role, content, tool_calls, tool_results, tokens, latency |
| `custom_agents` | User-created agent configurations |
| `knowledge_embeddings` | Vector embeddings for RAG (1536 dimensions, HNSW index) |
| `knowledge_sync_state` | Tracks sync state for knowledge base updates |
| `cockpit_sessions` | Mock game server sessions |

## Connection Commands

### Docker Compose (recommended)

```bash
# Interactive PostgreSQL shell
docker compose exec postgres psql -U takaro -d takaro_agent

# Run a single query
docker compose exec postgres psql -U takaro -d takaro_agent -c "SELECT * FROM conversations LIMIT 5;"

# Interactive Redis CLI
docker compose exec redis redis-cli
```

### From Host

```bash
# PostgreSQL (port 5433 on host, 5432 in container)
PGPASSWORD=takaro psql -h localhost -p 5433 -U takaro -d takaro_agent

# Redis
redis-cli -p 6379
```

## Useful Queries

```sql
-- List conversations with message counts
SELECT c.id, c.agent_id, c.title, c.created_at, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id
ORDER BY c.created_at DESC;

-- Find messages by conversation
SELECT id, role, LEFT(content, 100) as content_preview,
       tool_calls IS NOT NULL as has_tool_calls,
       created_at
FROM messages
WHERE conversation_id = 'YOUR-UUID-HERE'
ORDER BY created_at;

-- View tool executions (with JSON formatting)
SELECT id, role,
       jsonb_pretty(tool_calls) as tool_calls,
       jsonb_pretty(tool_results) as tool_results,
       token_count, latency_ms
FROM messages
WHERE conversation_id = 'YOUR-UUID-HERE'
  AND (tool_calls IS NOT NULL OR tool_results IS NOT NULL);

-- Check conversation state (module-writer stores moduleId, versionId)
SELECT id, agent_id, state->>'moduleId' as module_id,
       state->>'moduleName' as module_name
FROM conversations
WHERE state != '{}';

-- Custom agents overview
SELECT id, user_id, name, model, temperature,
       jsonb_array_length(tools) as tool_count,
       jsonb_array_length(knowledge_bases) as kb_count
FROM custom_agents;

-- Knowledge embedding stats
SELECT knowledge_base_id, version, COUNT(*) as chunk_count
FROM knowledge_embeddings
GROUP BY knowledge_base_id, version;
```

## Redis

Used for BullMQ job queues (knowledge base synchronization).

```bash
# Check queue status
docker compose exec redis redis-cli HGETALL bull:kb-sync:meta

# Count jobs by status
docker compose exec redis redis-cli ZCARD bull:kb-sync:completed
docker compose exec redis redis-cli ZCARD bull:kb-sync:failed
docker compose exec redis redis-cli ZCARD bull:kb-sync:delayed

# List failed job IDs
docker compose exec redis redis-cli ZRANGE bull:kb-sync:failed 0 -1

# Monitor real-time commands
docker compose exec redis redis-cli MONITOR
```

## Migrations

```bash
# Run migrations
docker compose exec app npm run db:migrate

# Rollback last batch
docker compose exec app npm run db:rollback
```

**Existing migrations:**
1. `001_initial.ts` - conversations, messages tables
2. `002_claude_tokens.ts` - (deprecated)
3. `003_conversation_provider.ts` - Added provider column
4. `004_user_api_keys.ts` - User API key storage (dropped by 010)
5. `005_drop_claude_tokens.ts` - Cleanup
6. `006_knowledge_embeddings.ts` - Vector embeddings (pgvector)
7. `007_knowledge_sync_state.ts` - Knowledge sync tracking
8. `008_custom_agents.ts` - User agent configurations
9. `009_cockpit_sessions.ts` - Mock server sessions
10. `010_drop_user_api_keys.ts` - Removes user_api_keys table (API key now from env var)

**Migration location:** `src/db/migrations/`

## Gotchas

- **Port mapping**: PostgreSQL is 5433 locally (5432 inside container)
- **Redis key types**: BullMQ uses sorted sets. Use `ZCARD`/`ZRANGE`, not `LLEN`/`LRANGE`
- **Migration extension**: Auto-detects `.ts` vs `.js` based on how it's run
- **Cascade deletes**: Deleting a conversation cascades to messages and cockpit sessions
