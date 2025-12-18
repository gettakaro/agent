import { AgentRuntime } from "../agents/AgentRuntime.js";
import { getToolsByNames } from "../agents/tools/registry.js";
import type { AgentVersionConfig, IAgent, ToolDefinition } from "../agents/types.js";
import { knowledgeRegistry } from "../knowledge/registry.js";
import type { CustomAgent } from "./types.js";

export function createAgentFromCustom(customAgent: CustomAgent): IAgent {
  // Resolve tools by name
  const tools: ToolDefinition[] = getToolsByNames(customAgent.tools);

  // Resolve knowledge base search tools
  for (const kbId of customAgent.knowledgeBases) {
    const kb = knowledgeRegistry.create(kbId);
    if (kb) {
      tools.push(kb.searchTool);
    }
  }

  const config: AgentVersionConfig = {
    model: customAgent.model,
    systemPrompt: customAgent.systemPrompt,
    tools,
    temperature: customAgent.temperature,
    maxTokens: customAgent.maxTokens,
    description: customAgent.description || undefined,
  };

  // Use "custom:{id}" as agent ID and "1" as version
  return new AgentRuntime(`custom:${customAgent.id}`, "1", config);
}
