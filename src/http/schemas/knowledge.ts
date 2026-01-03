import { z } from "zod";

export const searchKnowledgeQuerySchema = z.object({
  q: z.string().min(1, "Query parameter 'q' is required"),
  limit: z.coerce.number().positive().optional(),
});

export type SearchKnowledgeQuery = z.infer<typeof searchKnowledgeQuerySchema>;
