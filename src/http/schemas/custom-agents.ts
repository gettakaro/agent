import { z } from "zod";

export const createCustomAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(1),
  tools: z.array(z.string()),
  knowledgeBases: z.array(z.string()).optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export type CreateCustomAgentInput = z.infer<typeof createCustomAgentSchema>;

export const updateCustomAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  tools: z.array(z.string()).optional(),
  knowledgeBases: z.array(z.string()).optional(),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export type UpdateCustomAgentInput = z.infer<typeof updateCustomAgentSchema>;
