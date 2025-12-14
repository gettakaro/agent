# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Build + watch mode (tsc --watch & node --watch)
npm run build        # TypeScript compile + copy views/public to dist/
npm run start        # Run compiled app
npm run typecheck    # Type check without emitting

# Database
docker compose up -d           # Start PostgreSQL (port 5433)
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

**Registry Pattern**: Agents are registered at startup via `AgentRegistry`. Each agent type has a factory that creates agent instances with versioned configurations.

**AgentRuntime**: The conversation loop that:
1. Sends messages to LLM provider
2. Executes tool calls returned by LLM
3. Feeds tool results back to LLM
4. Repeats until LLM stops using tools (max 10 iterations)

**Adding a New Agent**:
1. Create directory under `src/agents/{agent-name}/`
2. Create `versions.ts` with `AgentVersionConfig` entries (model, system prompt, tools)
3. Create factory class implementing `IAgentFactory`
4. Register in `src/main.ts`

### Module Writer Agent (`src/agents/module-writer/`)

The current agent builds Takaro modules. It maintains module state in `context.state.module` and provides tools:
- `createModule` - Initialize module metadata
- `addCommand`, `addHook`, `addCronJob`, `addFunction`, `addPermission` - Add components
- `setConfigSchema` - Define configuration
- `validateModule` - Check for errors
- `exportModule` - Generate final module JSON

### Authentication (`src/takaro/client.ts`, `src/http/middleware/auth.ts`)

Two modes:
- **Service account** (dev): Set `TAKARO_USERNAME` + `TAKARO_PASSWORD`. Client logs in at startup and is reused.
- **Cookie-based** (production): Forward user's Takaro session cookies. Each request creates a new client.

The authenticated `Client` from `@takaro/apiclient` is attached to requests as `req.takaroClient` and passed to tools via `context.takaroClient`.

### Conversations (`src/conversations/`)

Conversations and messages are stored in PostgreSQL. Each conversation tracks:
- Which agent/version is being used
- Current state (JSON blob for agent-specific data)
- User ID (from Takaro auth)

### LLM Provider (`src/agents/providers/`)

Currently only `OpenRouterProvider` using the OpenAI SDK pointed at OpenRouter's API. Streaming is enabled - chunks are emitted via callback and forwarded as SSE events.

## Key Types

```typescript
// Tool definition - implement execute() for agent tools
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema7;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

// Context passed to every tool
interface ToolContext {
  conversationId: string;
  state: Record<string, unknown>;  // Mutable - persisted after each message
  takaroClient?: Client;            // Authenticated Takaro API client
}
```

## Error Handling

Use `formatError()` from `src/utils/formatError.ts` when logging errors. It extracts readable info from Axios errors instead of dumping the full error object.
