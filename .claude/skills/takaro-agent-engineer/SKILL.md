---
name: takaro-agent-engineer
description: Takaro Agent repository knowledge - architecture, database, API, agent development, and debugging workflows. Use when working on this codebase.
---

# Takaro Agent Engineer

AI service for Takaro module development. Provides conversational interface where users describe game server modules and agents build them via tool calls.

## Quick Reference

| Area | File | Key Command |
|------|------|-------------|
| Database | [DATABASE.md](DATABASE.md) | `docker compose exec postgres psql -U takaro -d takaro_agent` |
| API | [API.md](API.md) | `curl http://localhost:3100/health` |
| Agents | [AGENTS.md](AGENTS.md) | See agent/tool creation patterns |
| Development | [DEVELOPMENT.md](DEVELOPMENT.md) | `docker compose up` |

## Architecture

```
HTTP Request → Auth Middleware → Conversation Route → AgentRuntime → LLM Provider
                                                          ↓
                                                    Tool Execution
                                                          ↓
                                                    SSE Response
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AgentRegistry | `src/agents/registry.ts` | Stores agent factories by ID |
| AgentRuntime | `src/agents/AgentRuntime.ts` | Conversation loop, tool execution |
| ConversationService | `src/conversations/service.ts` | CRUD + message storage |
| LLM Providers | `src/agents/providers/` | OpenRouter adapter |

### Agent Experiments

Agents use compound identifiers for A/B testing: `{type}/{experiment}`

```
module-writer/grok-fast      # Grok model, fast responses
module-writer/concise        # Minimal token usage
module-writer/with-docs      # Enhanced with Takaro docs knowledge
player-moderator/default     # Player management agent
```

## Getting Started

```bash
# Start everything with Docker
docker compose up

# Run migrations (if needed)
docker compose exec app npm run db:migrate

# Local development (alternative)
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run dev
```

## Directory Structure

```
src/
├── agents/                 # Agent implementations
│   ├── module-writer/      # Module builder agent (32 tools)
│   ├── player-moderator/   # Player management agent
│   ├── providers/          # LLM provider adapters
│   ├── AgentRuntime.ts     # Conversation loop
│   └── registry.ts         # Agent registry
├── conversations/          # Conversation storage
├── custom-agents/          # User-created agent configurations
├── db/                     # Database migrations
├── http/                   # Express routes
├── knowledge/              # Vector embeddings for RAG
└── main.ts                 # Entry point
```

## Maintenance

This skill should stay accurate. During work:

- **Discover something useful?** → Ask if it should be added
- **Find outdated info?** → Ask if it should be updated
- **Run `/setup-engineer`** → Bulk update from current session
