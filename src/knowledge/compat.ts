/**
 * Compatibility layer maintaining the old vectorStore API while using new data layer.
 * This allows existing code to work unchanged during migration.
 */

import { insertChunks, vectorSearch as rawVectorSearch } from "./data/index.js";
import type { ChunkInsert } from "./data/types.js";
import { generateEmbedding, generateEmbeddings } from "./embeddings.js";
import type { Document, SearchOptions, SearchResult } from "./types.js";

/**
 * Search for similar documents in a knowledge base using vector similarity.
 * Compatibility function - maintains old API signature.
 */
export async function vectorSearch(
  knowledgeBaseId: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { limit = 5, minScore = 0 } = options;

  const queryEmbedding = await generateEmbedding(query);
  const results = await rawVectorSearch(knowledgeBaseId, queryEmbedding, limit);

  // Filter by minimum score and format results
  return results
    .filter((r) => r.similarity >= minScore)
    .map((r) => ({
      content: r.content,
      score: r.similarity,
      metadata: r.metadata,
    }));
}

/**
 * Upsert documents into a knowledge base.
 * Each document gets embedded and stored with its metadata.
 * Compatibility function - maintains old API signature.
 *
 * Documents can now include enhanced metadata from contextual chunking:
 * - contentWithContext: Chunk with document title and section path prepended
 * - documentTitle: Extracted from markdown structure
 * - sectionPath: Array of section headings
 */
export async function upsertDocuments(knowledgeBaseId: string, version: string, documents: Document[]): Promise<void> {
  if (documents.length === 0) return;

  // Generate embeddings in batches
  // Embed the contentWithContext if available (for better semantic matching)
  const BATCH_SIZE = 100;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    // Use contentWithContext for embedding if available, otherwise use content
    const texts = batch.map((d) => (d.metadata?.contentWithContext as string) ?? d.content);
    const embeddings = await generateEmbeddings(texts);

    // Build insert chunks with new schema
    const chunks: ChunkInsert[] = batch.map((doc, idx) => ({
      knowledgeBaseId,
      version,
      content: doc.content,
      contentWithContext: (doc.metadata?.contentWithContext as string) ?? doc.content,
      embedding: embeddings[idx]!,
      documentTitle: doc.metadata?.documentTitle as string | undefined,
      sectionPath: doc.metadata?.sectionPath as string[] | undefined,
      metadata: doc.metadata ?? {},
    }));

    await insertChunks(chunks);
  }
}
