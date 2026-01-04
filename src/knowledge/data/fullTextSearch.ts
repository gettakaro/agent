import { getDb } from "../../db/connection.js";
import type { KeywordSearchResult } from "./types.js";

const TABLE = "knowledge_embeddings";

/**
 * BM25-style keyword search using PostgreSQL tsvector.
 * Returns results ranked by relevance to the query text.
 */
export async function keywordSearch(
  knowledgeBaseId: string,
  query: string,
  limit: number = 5,
): Promise<KeywordSearchResult[]> {
  const db = getDb();

  // Use to_tsquery for phrase matching with English text search
  // ts_rank provides BM25-like ranking
  const results = await db(TABLE)
    .select(
      "id",
      "content",
      "content_with_context",
      "document_title",
      "section_path",
      "metadata",
      db.raw("ts_rank(content_tsvector, plainto_tsquery('english', ?)) as rank", [query]),
    )
    .where("knowledge_base_id", knowledgeBaseId)
    .whereRaw("content_tsvector @@ plainto_tsquery('english', ?)", [query])
    .orderByRaw("ts_rank(content_tsvector, plainto_tsquery('english', ?)) DESC", [query])
    .limit(limit);

  return results.map((row: any) => ({
    id: row.id,
    content: row.content,
    contentWithContext: row.content_with_context,
    documentTitle: row.document_title,
    sectionPath: row.section_path,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
    rank: row.rank,
  }));
}
