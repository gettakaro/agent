import { getDb } from '../db/connection.js';
import { generateEmbedding, generateEmbeddings } from './embeddings.js';
import type { Document, SearchResult, SearchOptions } from './types.js';

const TABLE = 'knowledge_embeddings';

interface EmbeddingRow {
  id: string;
  knowledge_base_id: string;
  version: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

/**
 * Search for similar documents in a knowledge base using vector similarity.
 */
export async function vectorSearch(
  knowledgeBaseId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5, minScore = 0, filters } = options;

  const queryEmbedding = await generateEmbedding(query);
  const db = getDb();

  // Build the query with cosine similarity
  // pgvector uses <=> for cosine distance, we convert to similarity (1 - distance)
  let sqlQuery = db(TABLE)
    .select(
      'content',
      'metadata',
      db.raw('1 - (embedding <=> ?::vector) as score', [
        `[${queryEmbedding.join(',')}]`,
      ])
    )
    .where('knowledge_base_id', knowledgeBaseId);

  // Apply metadata filters if provided
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        sqlQuery = sqlQuery.whereRaw('metadata->>? = ?', [
          key,
          String(value),
        ]);
      }
    }
  }

  // Filter by minimum score and order by similarity
  const results = await sqlQuery
    .whereRaw('1 - (embedding <=> ?::vector) >= ?', [
      `[${queryEmbedding.join(',')}]`,
      minScore,
    ])
    .orderByRaw('embedding <=> ?::vector', [`[${queryEmbedding.join(',')}]`])
    .limit(limit);

  return results.map((row: EmbeddingRow & { score: number }) => ({
    content: row.content,
    score: row.score,
    metadata: row.metadata,
  }));
}

/**
 * Upsert documents into a knowledge base.
 * Each document gets embedded and stored with its metadata.
 */
export async function upsertDocuments(
  knowledgeBaseId: string,
  version: string,
  documents: Document[]
): Promise<void> {
  if (documents.length === 0) return;

  const db = getDb();

  // Generate embeddings in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const texts = batch.map((d) => d.content);
    const embeddings = await generateEmbeddings(texts);

    // Build insert rows
    const rows = batch.map((doc, idx) => ({
      knowledge_base_id: knowledgeBaseId,
      version,
      content: doc.content,
      embedding: db.raw('?::vector', [`[${embeddings[idx]!.join(',')}]`]),
      metadata: JSON.stringify(doc.metadata ?? {}),
    }));

    await db(TABLE).insert(rows);
  }
}

/**
 * Delete all documents for a knowledge base, optionally filtered by version.
 */
export async function deleteByKnowledgeBase(
  knowledgeBaseId: string,
  version?: string
): Promise<number> {
  const db = getDb();

  let query = db(TABLE).where('knowledge_base_id', knowledgeBaseId);
  if (version) {
    query = query.where('version', version);
  }

  const deletedCount = await query.del();
  return deletedCount;
}

/**
 * Get count of documents in a knowledge base.
 */
export async function getDocumentCount(
  knowledgeBaseId: string,
  version?: string
): Promise<number> {
  const db = getDb();

  let query = db(TABLE).where('knowledge_base_id', knowledgeBaseId);
  if (version) {
    query = query.where('version', version);
  }

  const result = await query.count('* as count').first();
  return Number(result?.count ?? 0);
}

/**
 * Delete chunks from a specific source file.
 * Used for incremental sync when a file is modified or removed.
 */
export async function deleteBySourceFile(
  knowledgeBaseId: string,
  sourceFile: string
): Promise<number> {
  const db = getDb();
  return await db(TABLE)
    .where('knowledge_base_id', knowledgeBaseId)
    .whereRaw("metadata->>'sourceFile' = ?", [sourceFile])
    .del();
}
