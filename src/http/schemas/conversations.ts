import { registry, z } from "../openapi/registry.js";

export const createConversationSchema = registry.register(
  "CreateConversation",
  z.object({
    agentId: z.string().min(1, "agentId is required").openapi({ description: "Agent identifier" }),
    agentVersion: z.string().optional().openapi({ description: "Optional agent version" }),
  }),
);

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = registry.register(
  "SendMessage",
  z.object({
    content: z
      .string()
      .min(1, "content is required")
      .max(50000, "content must be 50000 characters or less")
      .openapi({ description: "Message content" }),
  }),
);

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
