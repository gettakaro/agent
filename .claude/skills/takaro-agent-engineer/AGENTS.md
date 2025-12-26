# Agents and Tools

## Architecture

### AgentRegistry

Singleton that manages agent factories. Supports compound IDs for A/B testing:

- `module-writer` - uses default experiment
- `module-writer/grok-fast` - specific experiment
- `module-writer@1.0.0` - pinned semver version

### AgentRuntime

Conversation loop (max 10 iterations):

1. Send messages + system prompt + tools to LLM
2. If tool calls: execute, emit results via SSE, add to conversation, loop
3. If no tool calls: emit final text and done

## Available Agents

### module-writer

Builds Takaro modules via API calls. 32 tools by domain:

| Directory | Tools |
|-----------|-------|
| `module/` | createModule, updateModule, deleteModule, getModule, listModuleDefinitions, installModule, uninstallModule |
| `command/` | addCommand, updateCommand, deleteCommand, getCommand, searchCommands, triggerCommand |
| `hook/` | addHook, updateHook, deleteHook, getHook, searchHooks, triggerHook |
| `cronjob/` | addCronJob, updateCronJob, deleteCronJob, getCronJob, searchCronJobs, triggerCronJob |
| `function/` | addFunction, updateFunction, deleteFunction, getFunction, searchFunctions |
| `gameserver/` | getGameServers, getGameServer, getOnlinePlayers |
| `debug/` | searchEvents, getSettings, searchPlayers |

**Experiments:**

| Experiment | Model | Description |
|------------|-------|-------------|
| `grok-fast` | `x-ai/grok-code-fast-1` | Default, balanced speed/quality |
| `gpt-oss` | `openai/gpt-4.1-nano` | General-purpose |
| `concise` | `x-ai/grok-code-fast-1` | Minimal responses |
| `with-docs` | `x-ai/grok-code-fast-1` | With Takaro docs knowledge |

### player-moderator

Manages players, bans, and roles. 14 tools including shared tools from module-writer.

## Creating a New Agent

### Step 1: Define versions

```typescript
// src/agents/{name}/versions.ts
import type { AgentVersionConfig } from "../types.js";
import { SYSTEM_PROMPT_V1 } from "./prompts/v1.js";
import { myAgentTools } from "./tools/index.js";

export const MY_AGENT_EXPERIMENTS: Record<string, AgentVersionConfig> = {
  "fast": {
    model: "x-ai/grok-code-fast-1",
    systemPrompt: SYSTEM_PROMPT_V1,
    tools: myAgentTools,
    temperature: 0.7,
    maxTokens: 8192,
  },
};

export const DEFAULT_EXPERIMENT = "fast";
```

### Step 2: Create factory

```typescript
// src/agents/{name}/index.ts
import { AgentRuntime } from "../AgentRuntime.js";
import type { IAgent, IAgentFactory } from "../types.js";
import { DEFAULT_EXPERIMENT, MY_AGENT_EXPERIMENTS } from "./versions.js";

export class MyAgentFactory implements IAgentFactory {
  readonly agentId = "my-agent";

  createAgent(experimentOrVersion: string): IAgent {
    const config = MY_AGENT_EXPERIMENTS[experimentOrVersion];
    if (!config) {
      throw new Error(`Unknown experiment '${experimentOrVersion}'`);
    }
    return new AgentRuntime(this.agentId, experimentOrVersion, config);
  }

  listVersions(): string[] {
    return Object.keys(MY_AGENT_EXPERIMENTS);
  }

  getDefaultVersion(): string {
    return DEFAULT_EXPERIMENT;
  }
}
```

### Step 3: Register in main.ts

```typescript
import { MyAgentFactory } from "./agents/my-agent/index.js";

agentRegistry.register(new MyAgentFactory());
```

## Creating Tools

### Tool Definition

```typescript
interface ToolDefinition {
  name: string;                    // Name exposed to LLM
  description: string;             // What the tool does
  parameters: JSONSchema7;         // JSON Schema for arguments
  variant?: string;                // Internal A/B variant (not exposed to LLM)
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}
```

### Tool Context

```typescript
interface ToolContext {
  conversationId: string;
  agentId: string;
  agentVersion: string;
  state: Record<string, unknown>;  // Mutable - persisted after each message
  userId?: string;
  takaroClient?: Client;           // Authenticated Takaro API client
  openrouterApiKey?: string;
}
```

### Example Tool

```typescript
export const createModule: ToolDefinition = {
  name: "createModule",
  description: "Create a new module in Takaro",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Module name" },
      description: { type: "string" },
    },
    required: ["name"],
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client" };
    }

    const response = await context.takaroClient.module.moduleControllerCreate({
      name: args.name as string,
      latestVersion: { description: args.description as string || "" },
    });

    // Store in state for subsequent tools
    context.state.moduleId = response.data.data.id;
    context.state.versionId = response.data.data.latestVersion.id;

    return {
      success: true,
      output: { moduleId: context.state.moduleId },
    };
  },
};
```

### Tool Result

```typescript
interface ToolResult {
  success: boolean;
  output: unknown;    // JSON-serializable on success
  error?: string;     // Message on failure
}
```

## Tool Variants

For A/B testing different implementations:

```typescript
export const listModulesFiltered: ToolDefinition = {
  name: "listModules",           // LLM sees this name
  variant: "filtered",           // Internal tracking only
  // ...
};
```

## Gotchas

### @takaro/apiclient Quirks

- `moduleControllerCreate` auto-creates "latest" version - access via `response.data.data.latestVersion.id`
- Module installation: `module.moduleInstallationsControllerInstallModule({ versionId, gameServerId })`
- `gameServerControllerGetPlayers` types say object but returns array - cast needed
- 409 Conflict for duplicate-named components

### Tool State Persistence

`context.state` is mutable and persisted. Tools communicate via state:
1. `createModule` stores `moduleId`, `versionId`, `moduleName`
2. `addCommand` reads `versionId` to know which module to modify

### Tool Reuse

Tools can be shared between agents - player-moderator imports several from module-writer.

### Iteration Limit

Max 10 tool-calling iterations per message (safety limit in AgentRuntime).
