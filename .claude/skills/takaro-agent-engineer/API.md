# HTTP API

Express app on port 3100 with SSE streaming for agent responses.

## Starting the API

```bash
# Docker (recommended)
docker compose up

# Local development
npm run dev
```

## Health Check

```bash
curl http://localhost:3100/health
# {"status":"ok"}
```

## Authentication

**Service Account Mode (Development)**

Set env vars and the client logs into Takaro at startup:
```bash
TAKARO_USERNAME=your-username
TAKARO_PASSWORD=your-password
```

**Cookie-Based Auth (Production)**

Without service credentials, API routes return 401 and view routes redirect to Takaro login.

**LLM Provider**

Server uses `OPENROUTER_API_KEY` environment variable (required at startup).

## Endpoints

### Auth (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user info |

### Conversations (`/api/conversations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/:id` | Get specific conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/conversations/:id/messages` | Send message (SSE streaming) |
| GET | `/api/conversations/by-agent/:agentId` | List by agent type |

### Custom Agents (`/api/custom-agents`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/custom-agents/tools` | List available tools |
| GET | `/api/custom-agents/models` | List available LLM models |
| GET | `/api/custom-agents/knowledge-bases` | List knowledge bases |
| GET | `/api/custom-agents` | List user's custom agents |
| GET | `/api/custom-agents/:id` | Get specific agent |
| POST | `/api/custom-agents` | Create custom agent |
| PUT | `/api/custom-agents/:id` | Update custom agent |
| DELETE | `/api/custom-agents/:id` | Delete custom agent |

### Knowledge Bases (`/api/knowledge-bases`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge-bases` | List all with stats |
| GET | `/api/knowledge-bases/:kbId` | Get details |
| GET | `/api/knowledge-bases/:kbId/search?q=` | Search |
| POST | `/api/knowledge-bases/:kbId/sync` | Trigger sync job |

### Cockpit (`/api/cockpit`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cockpit/sessions/:conversationId` | Get/create session |
| POST | `/api/cockpit/sessions/:sessionId/mock-server/start` | Start mock server |
| GET | `/api/cockpit/sessions/:sessionId/events` | SSE event stream |

## Example Requests

```bash
# Create conversation
curl -X POST http://localhost:3100/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"agentId": "module-writer"}'

# Send message (SSE stream)
curl -N -X POST http://localhost:3100/api/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Create a hello world module"}'

# Create custom agent
curl -X POST http://localhost:3100/api/custom-agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Agent",
    "systemPrompt": "You are a helpful assistant.",
    "tools": ["getGameServers"],
    "knowledgeBases": [],
    "model": "anthropic/claude-sonnet-4",
    "temperature": 0.7
  }'

# Search knowledge base
curl 'http://localhost:3100/api/knowledge-bases/takaro-docs/search?q=hook&limit=5'
```

## SSE Event Types

| Event | Description |
|-------|-------------|
| `text` | Text chunk from LLM: `{"type":"text","content":"..."}` |
| `tool_use` | Tool call: `{"type":"tool_use","toolName":"...","input":{...}}` |
| `tool_result` | Result: `{"type":"tool_result","toolName":"...","success":true,"output":"..."}` |
| `done` | Complete: `{"type":"done","usage":{"inputTokens":N,"outputTokens":N}}` |
| `error` | Error: `{"error":"..."}` |

## Available Agents

Built-in:
- `module-writer/grok-fast` (default)
- `module-writer/gpt-oss`
- `module-writer/concise`
- `module-writer/with-docs`
- `player-moderator/default`

Custom agents: `custom:{uuid}`

## Available Models

- `x-ai/grok-4.1-fast`
- `openai/gpt-4.1-nano`
- `anthropic/claude-sonnet-4`
- `anthropic/claude-haiku-4.5`
- `google/gemini-2.5-flash`

## Gotchas

- **Agent ID format**: `{type}/{experiment}` or `custom:{uuid}`
- **Ownership checks**: All operations verify user owns the resource (403 otherwise)
- **Title generation**: Auto-generated after first exchange (fire-and-forget)
- **Error format**: `{"error": "message"}`, some include `code` field
