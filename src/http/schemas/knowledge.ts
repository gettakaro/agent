import { registry, z } from "../openapi/registry.js";

export const searchKnowledgeQuerySchema = registry.register(
  "SearchKnowledgeQuery",
  z.object({
    q: z.string().min(1, "Query parameter 'q' is required").openapi({ description: "Search query" }),
    limit: z.coerce.number().positive().optional().openapi({ description: "Max results to return", default: 5 }),
  }),
);

export type SearchKnowledgeQuery = z.infer<typeof searchKnowledgeQuerySchema>;
