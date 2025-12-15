# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Build + watch mode (tsc --watch & node --watch)
npm run build        # TypeScript compile + copy views/public to dist/
npm run start        # Run compiled app
npm run typecheck    # Type check without emitting

# Database & Redis
docker compose up -d           # Start PostgreSQL (port 5433) and Redis (port 6379)
npm run db:migrate             # Run migrations
npm run db:rollback            # Rollback last migration
```

## Architecture

This is an AI agent service for Takaro module development. It provides a conversational interface where users can describe what game server module they want, and the agent builds it using tools.

### Core Flow

```
HTTP Request → Auth Middleware → Conversation Route → AgentRuntime → LLM Provider
                                                          ↓
                                                    Tool Execution
                                                          ↓
                                                    SSE Response
```

### Agent System (`src/agents/`)

**Experiment Naming**: Agents use compound identifiers for A/B testing: `{type}/{experiment}`
- `module-writer/grok-fast` - Grok model experiment
- `module-writer/claude-verbose` - Claude with verbose prompts
- Once proven, experiments promote to stable: `module-writer@1.0.0`

**Registry Pattern**: Agents registered at startup via `AgentRegistry`. Each agent type has a factory that creates instances for different experiments.

**AgentRuntime**: The conversation loop that:
1. Sends messages to LLM provider
2. Executes tool calls returned by LLM
3. Feeds tool results back to LLM
4. Repeats until LLM stops using tools (max 10 iterations)

**Adding a New Agent Experiment**:
1. Create directory under `src/agents/{agent-name}/`
2. Create `versions.ts` with experiment configs (model, system prompt, tools)
3. Create factory class implementing `IAgentFactory`
4. Register in `src/main.ts`

**Tool Variants**: Tools can have internal variants for testing different implementations:
```typescript
{ name: 'listModules', variant: 'filtered', ... }  // LLM sees 'listModules'
```

### Module Writer Agent (`src/agents/module-writer/`)

The module-writer agent builds Takaro modules via direct API calls. It maintains state in `context.state` (moduleId, versionId, moduleName).

**Tools** (`src/agents/module-writer/tools/`) - 32 tools organized by subdirectory:

| Directory | Tools |
|-----------|-------|
| `module/` | `createModule`, `updateModule`, `deleteModule`, `getModule`, `listModuleDefinitions`, `installModule`, `uninstallModule` |
| `command/` | `addCommand`, `updateCommand`, `deleteCommand`, `getCommand`, `searchCommands`, `triggerCommand` |
| `hook/` | `addHook`, `updateHook`, `deleteHook`, `getHook`, `searchHooks`, `triggerHook` |
| `cronjob/` | `addCronJob`, `updateCronJob`, `deleteCronJob`, `getCronJob`, `searchCronJobs`, `triggerCronJob` |
| `function/` | `addFunction`, `updateFunction`, `deleteFunction`, `getFunction`, `searchFunctions` |
| `gameserver/` | `getGameServers`, `getGameServer`, `getOnlinePlayers` |
| `debug/` | `searchEvents`, `getSettings`, `searchPlayers` |

### Authentication

**User Identity** (`src/takaro/client.ts`, `src/http/middleware/auth.ts`):
- **Service account** (dev): Set `TAKARO_USERNAME` + `TAKARO_PASSWORD`. Client logs in at startup and is reused.
- **Cookie-based** (production): Forward user's Takaro session cookies. Each request creates a new client.

The authenticated `Client` from `@takaro/apiclient` is attached to requests as `req.takaroClient` and passed to tools via `context.takaroClient`.

**LLM Credentials (BYOK)** (`src/auth/`, `/settings` page):
Users must provide their own OpenRouter API key via the Settings page (stored in `user_api_keys` table).

### Conversations (`src/conversations/`)

Conversations and messages are stored in PostgreSQL. Each conversation tracks:
- Which agent/version is being used
- Current state (JSON blob for agent-specific data)
- User ID (from Takaro auth)

### LLM Provider (`src/agents/providers/`)

**OpenRouterProvider**: Uses OpenAI SDK pointed at OpenRouter's API. Requires user's OpenRouter API key. Supports streaming - chunks are emitted via callback and forwarded as SSE events.

## Key Types

```typescript
// Tool definition - implement execute() for agent tools
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema7;
  variant?: string;  // Internal variant for A/B testing (not exposed to LLM)
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

// Context passed to every tool
interface ToolContext {
  conversationId: string;
  agentId: string;
  agentVersion: string;
  state: Record<string, unknown>;  // Mutable - persisted after each message
  userId?: string;
  takaroClient?: Client;           // Authenticated Takaro API client
  provider?: 'openrouter';
  openrouterApiKey?: string;
}
```

## Error Handling

Use `formatError()` from `src/utils/formatError.ts` when logging errors. It extracts readable info from Axios errors instead of dumping the full error object.

## Testing the Agent API

```bash
# Health check
curl http://localhost:3100/health

# List conversations
curl http://localhost:3100/api/conversations

# Create conversation (compound ID includes experiment)
curl -X POST http://localhost:3100/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"agentId": "module-writer/grok-fast"}'

# Send message (SSE streaming response)
curl -N -X POST http://localhost:3100/api/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Create a hello world module"}'
```

SSE events: `text`, `tool_use`, `tool_result`, `done`, `error`

## @takaro/apiclient Notes

Quirks discovered during tool development:

- `moduleControllerCreate` automatically creates a "latest" version - access via `response.data.data.latestVersion.id`
- Module installation uses `module.moduleInstallationsControllerInstallModule({ versionId, gameServerId })` (not on gameserver controller)
- `gameServerControllerGetPlayers` TypeScript types say single object but returns array at runtime - cast with `as unknown as Array<...>`
- 409 Conflict returned when creating duplicate-named components (hooks, cronjobs, functions)
