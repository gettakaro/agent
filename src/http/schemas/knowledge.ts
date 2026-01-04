import { z } from "zod";

export const searchKnowledgeQuerySchema = z.object({
  q: z.string().min(1, "Query parameter 'q' is required"),
  limit: z.coerce.number().positive().optional(),
  thoroughness: z.enum(["fast", "balanced", "thorough"]).optional(),
});

export type SearchKnowledgeQuery = z.infer<typeof searchKnowledgeQuerySchema>;
