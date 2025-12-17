import {
  parseGitHubUrl,
  fetchGitHubDirectory,
  listGitHubFiles,
  fetchFileContent,
} from './github.js';
import { chunkText, chunkFiles, type ChunkOptions } from './chunker.js';
import { upsertDocuments, deleteByKnowledgeBase } from '../vectorStore.js';
import type { IngestResult, Document } from '../types.js';

export { parseGitHubUrl, fetchGitHubDirectory, listGitHubFiles, fetchFileContent } from './github.js';
export { chunkText, chunkFiles, type Chunk, type ChunkOptions } from './chunker.js';

export interface IngestFromGitHubOptions extends ChunkOptions {
  /** File extensions to include (default: ['.md', '.txt']) */
  extensions?: string[];
  /** Whether to delete existing documents before ingesting (default: true) */
  replaceExisting?: boolean;
}

/**
 * Ingest documents from a GitHub repository folder into a knowledge base.
 * Processes files one at a time to avoid OOM with large directories.
 *
 * @example
 * await ingestFromGitHub(
 *   'takaro-docs',
 *   '1.0.0',
 *   'https://github.com/gettakaro/takaro/tree/development/packages/web-docs/docs'
 * );
 */
export async function ingestFromGitHub(
  knowledgeBaseId: string,
  version: string,
  githubUrl: string,
  options: IngestFromGitHubOptions = {}
): Promise<IngestResult> {
  const {
    extensions = ['.md', '.txt'],
    replaceExisting = true,
    chunkSize,
    overlap,
  } = options;

  // Parse the GitHub URL
  const parsed = parseGitHubUrl(githubUrl);

  // Delete existing documents first if requested
  if (replaceExisting) {
    await deleteByKnowledgeBase(knowledgeBaseId, version);
  }

  // Get file list (paths only, no content - memory efficient)
  const filePaths = await listGitHubFiles(parsed, { extensions });

  if (filePaths.length === 0) {
    return {
      documentsProcessed: 0,
      chunksCreated: 0,
    };
  }

  let documentsProcessed = 0;
  let chunksCreated = 0;

  // Process files one at a time to avoid OOM
  for (const filePath of filePaths) {
    // Fetch single file content
    const content = await fetchFileContent(
      parsed.owner,
      parsed.repo,
      parsed.branch,
      filePath
    );

    // Chunk single file
    const chunks = chunkText(content, filePath, { chunkSize, overlap });

    // Convert to documents and insert (embeddings generated inside)
    const documents: Document[] = chunks.map((chunk) => ({
      content: chunk.content,
      metadata: chunk.metadata,
    }));

    await upsertDocuments(knowledgeBaseId, version, documents);

    documentsProcessed++;
    chunksCreated += chunks.length;
  }

  return {
    documentsProcessed,
    chunksCreated,
  };
}
