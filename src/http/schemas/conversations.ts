import { z } from "zod";

export const createConversationSchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  agentVersion: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1, "content is required").max(50000, "content must be 50000 characters or less"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
