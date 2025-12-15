# Takaro Agent

AI service for Takaro module development. Provides conversational interface where users describe game server modules and agents build them via tool calls.

## Core Concepts

### Agents & Experiments

Agents are loose abstractions: message in, message out. What happens inside is intentionally unspecified - could be any LLM framework.

Agents use compound identifiers: `{type}/{experiment}`

```
module-writer/grok-minimal      # Grok model, minimal toolset
module-writer/claude-verbose    # Claude model, verbose prompts
module-writer/gpt4-filtered     # GPT-4, filtered tool outputs
```

Multiple experiments run in parallel for evaluation. Once proven, experiments promote to stable versions: `module-writer@1.0.0`

### Tools & Variants

Tools have internal variants for A/B testing different implementations:

```typescript
// Internal: listModules/filtered
// LLM sees: listModules (with filter params available)
{
  name: 'listModules',
  variant: 'filtered',  // tracking only
  parameters: { /* includes filter options */ }
}
```

Variants enable testing different:
- Parameter schemas (simple vs advanced filtering)
- Output formats (verbose vs truncated for context savings)
- Behaviors (strict vs permissive validation)

LLM never sees variant names - just the tool with its parameters.

### Evaluation

LLMs are non-deterministic. Evaluation isn't pass/fail:

```
User: I want to visit the Ghent office
Agent: You have provided invalid information.

vs

User: I want to visit the Ghent office
Agent: Please provide the time of arrival and date of departure
```

Both "work" but second is clearly better. Success markers per agent:
- Module writer: module created successfully
- Fewer tool calls for same result = better
- User feedback (thumbs up/down, ratings)

All conversations stored for: few-shot prompts, test cases, fine-tuning, performance tracking.

## Architecture

```
HTTP Request → Auth Middleware → Conversation Route → AgentRuntime → LLM Provider
                                                          ↓
                                                    Tool Execution
                                                          ↓
                                                    SSE Response
```

### Flow

1. Request arrives with conversation ID
2. Auth middleware attaches user + authenticated Takaro client
3. User message stored in DB
4. AgentRuntime loops:
   - Send messages to LLM
   - Execute any tool calls
   - Feed results back
   - Repeat until LLM stops using tools (max 10 iterations)
5. SSE streams chunks: `text`, `tool_use`, `tool_result`, `done`
6. State persisted to conversation record

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AgentRegistry | `src/agents/registry.ts` | Stores agent factories by ID |
| AgentRuntime | `src/agents/AgentRuntime.ts` | Conversation loop, tool execution |
| ConversationService | `src/conversations/service.ts` | CRUD + message storage |
| LLM Providers | `src/agents/providers/` | OpenRouter, Anthropic adapters |

### Database

```
conversations: id, agent_id, state (JSON), user_id, created_at
messages: id, conversation_id, role, content, tool_calls (JSON)
```

State is a JSON blob for agent-specific data (e.g., module writer stores `moduleId`, `versionId`).

## Module Writer Agent

Current agent implementation. Builds Takaro modules via API calls.

**32 tools** organized by domain:

| Domain | Tools |
|--------|-------|
| module | create, update, delete, get, list, install, uninstall |
| command | add, update, delete, get, search, trigger |
| hook | add, update, delete, get, search, trigger |
| cronjob | add, update, delete, get, search, trigger |
| function | add, update, delete, get, search |
| gameserver | getServers, getServer, getOnlinePlayers |
| debug | searchEvents, getSettings, searchPlayers |

Tools use `context.takaroClient` for API calls and `context.state` for cross-call persistence.

## Running

```bash
docker compose up -d    # PostgreSQL + Redis
npm install
npm run db:migrate
npm run dev             # Build + watch mode
```

## Adding an Agent Experiment

1. Create experiment config in `src/agents/{type}/experiments.ts`:
```typescript
export const EXPERIMENTS = {
  'grok-minimal': {
    model: 'x-ai/grok-3-fast',
    systemPrompt: MINIMAL_PROMPT,
    tools: coreTools,
  },
  'claude-verbose': {
    model: 'anthropic/claude-sonnet-4',
    systemPrompt: VERBOSE_PROMPT,
    tools: [...coreTools, ...debugTools],
  },
};
```

2. Register factory in `src/main.ts`

3. Create conversation with experiment ID:
```bash
curl -X POST /api/conversations \
  -d '{"agentId": "module-writer/claude-verbose"}'
```
