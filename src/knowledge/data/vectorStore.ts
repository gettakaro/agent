import { getDb } from "../../db/connection.js";
import type { ChunkInsert, VectorSearchResult } from "./types.js";

const TABLE = "knowledge_embeddings";

/**
 * Insert chunks with embeddings into the database.
 * Pure data operation - does not generate embeddings.
 */
export async function insertChunks(chunks: ChunkInsert[]): Promise<void> {
  if (chunks.length === 0) return;

  const db = getDb();

  const rows = chunks.map((chunk) => ({
    knowledge_base_id: chunk.knowledgeBaseId,
    version: chunk.version,
    content: chunk.content,
    content_with_context: chunk.contentWithContext,
    embedding: db.raw("?::vector", [`[${chunk.embedding.join(",")}]`]),
    document_title: chunk.documentTitle,
    section_path: chunk.sectionPath ?? null,
    metadata: JSON.stringify(chunk.metadata ?? {}),
  }));

  await db(TABLE).insert(rows);
}

/**
 * Raw vector similarity search against embeddings.
 * Returns results ordered by cosine similarity.
 */
export async function vectorSearch(
  knowledgeBaseId: string,
  queryEmbedding: number[],
  limit: number = 5,
): Promise<VectorSearchResult[]> {
  const db = getDb();

  const results = await db(TABLE)
    .select(
      "id",
      "content",
      "content_with_context",
      "document_title",
      "section_path",
      "metadata",
      db.raw("1 - (embedding <=> ?::vector) as similarity", [`[${queryEmbedding.join(",")}]`]),
    )
    .where("knowledge_base_id", knowledgeBaseId)
    .orderByRaw("embedding <=> ?::vector", [`[${queryEmbedding.join(",")}]`])
    .limit(limit);

  return results.map((row: any) => {
    let metadata = {};
    try {
      metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
    } catch (error) {
      console.error(`Failed to parse metadata for chunk ${row.id}:`, error);
      metadata = { parseError: true };
    }

    return {
      id: row.id,
      content: row.content,
      contentWithContext: row.content_with_context,
      documentTitle: row.document_title,
      sectionPath: row.section_path,
      metadata,
      similarity: row.similarity,
    };
  });
}

/**
 * Delete all embeddings for a knowledge base, optionally filtered by version.
 */
export async function deleteByKnowledgeBase(knowledgeBaseId: string, version?: string): Promise<number> {
  const db = getDb();

  let query = db(TABLE).where("knowledge_base_id", knowledgeBaseId);
  if (version) {
    query = query.where("version", version);
  }

  return await query.del();
}

/**
 * Get count of embeddings in a knowledge base.
 */
export async function getDocumentCount(knowledgeBaseId: string, version?: string): Promise<number> {
  const db = getDb();

  let query = db(TABLE).where("knowledge_base_id", knowledgeBaseId);
  if (version) {
    query = query.where("version", version);
  }

  const result = await query.count("* as count").first();
  return Number(result?.count ?? 0);
}

/**
 * Delete chunks from a specific source file.
 * Used for incremental sync when a file is modified or removed.
 */
export async function deleteBySourceFile(knowledgeBaseId: string, sourceFile: string): Promise<number> {
  const db = getDb();
  return await db(TABLE)
    .where("knowledge_base_id", knowledgeBaseId)
    .whereRaw("metadata->>'sourceFile' = ?", [sourceFile])
    .del();
}
