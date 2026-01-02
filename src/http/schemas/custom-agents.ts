import { registry, z } from "../openapi/registry.js";

export const createCustomAgentSchema = registry.register(
  "CreateCustomAgent",
  z.object({
    name: z.string().min(1).max(100).openapi({ description: "Agent name (max 100 chars)" }),
    description: z.string().optional().openapi({ description: "Agent description" }),
    systemPrompt: z.string().min(1).openapi({ description: "System prompt for the agent" }),
    tools: z.array(z.string()).openapi({ description: "List of tool names to enable" }),
    knowledgeBases: z.array(z.string()).optional().openapi({ description: "List of knowledge base IDs" }),
    model: z.string().min(1).openapi({ description: "LLM model identifier" }),
    temperature: z.number().min(0).max(2).optional().openapi({ description: "Temperature (0-2)", default: 0.7 }),
    maxTokens: z.number().positive().optional().openapi({ description: "Max tokens", default: 8192 }),
  }),
);

export type CreateCustomAgentInput = z.infer<typeof createCustomAgentSchema>;

export const updateCustomAgentSchema = registry.register(
  "UpdateCustomAgent",
  z.object({
    name: z.string().max(100).optional().openapi({ description: "Agent name (max 100 chars)" }),
    description: z.string().optional().openapi({ description: "Agent description" }),
    systemPrompt: z.string().optional().openapi({ description: "System prompt for the agent" }),
    tools: z.array(z.string()).optional().openapi({ description: "List of tool names to enable" }),
    knowledgeBases: z.array(z.string()).optional().openapi({ description: "List of knowledge base IDs" }),
    model: z.string().optional().openapi({ description: "LLM model identifier" }),
    temperature: z.number().min(0).max(2).optional().openapi({ description: "Temperature (0-2)" }),
    maxTokens: z.number().positive().optional().openapi({ description: "Max tokens" }),
  }),
);

export type UpdateCustomAgentInput = z.infer<typeof updateCustomAgentSchema>;
