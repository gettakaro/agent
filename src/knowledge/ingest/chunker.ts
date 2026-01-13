import { buildContextualPrefix, extractMarkdownStructure, getSectionPath, type MarkdownStructure } from "./metadata.js";

export interface Chunk {
  content: string;
  contentWithContext: string;
  index: number;
  metadata: {
    sourceFile: string;
    chunkIndex: number;
    totalChunks: number;
    documentTitle?: string;
    sectionPath?: string[];
  };
}

export interface ChunkOptions {
  /** Target chunk size in characters (default: 1000) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default: 200) */
  overlap?: number;
  /** Minimum chunk size - chunks smaller than this are discarded (default: 50) */
  minChunkSize?: number;
}

/**
 * Split text into overlapping chunks with contextual metadata.
 * For markdown files, extracts document structure and prepends context to each chunk.
 * Tries to break at paragraph or sentence boundaries when possible.
 */
export function chunkText(text: string, sourceFile: string, options: ChunkOptions = {}): Chunk[] {
  const { chunkSize = 1000, overlap = 200, minChunkSize = 50 } = options;

  // Extract markdown structure if this is a markdown file
  const isMarkdown = sourceFile.endsWith(".md");
  let mdStructure: MarkdownStructure | null = null;

  if (isMarkdown) {
    mdStructure = extractMarkdownStructure(text, sourceFile);
  }

  // Handle single chunk case
  if (text.length <= chunkSize) {
    const sectionPath = mdStructure ? getSectionPath(mdStructure.sections, 0) : undefined;
    const contextualContent = mdStructure
      ? buildContextualPrefix(mdStructure.title, sectionPath || []) + text.trim()
      : text.trim();

    return [
      {
        content: text.trim(),
        contentWithContext: contextualContent,
        index: 0,
        metadata: {
          sourceFile,
          chunkIndex: 0,
          totalChunks: 1,
          documentTitle: mdStructure?.title,
          sectionPath,
        },
      },
    ];
  }

  const chunks: Chunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // If not at the end, try to find a good break point
    if (end < text.length) {
      // Look for paragraph break (double newline)
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      if (paragraphBreak > start + chunkSize / 2) {
        end = paragraphBreak + 2;
      } else {
        // Look for sentence break (must be far enough from start to allow progress)
        const sentenceBreak = findSentenceBreak(text, start + chunkSize / 2, end);
        if (sentenceBreak > start + overlap) {
          end = sentenceBreak;
        } else {
          // Look for any newline
          const lineBreak = text.lastIndexOf("\n", end);
          if (lineBreak > start + chunkSize / 2) {
            end = lineBreak + 1;
          }
        }
      }
    } else {
      end = text.length;
    }

    const content = text.slice(start, end).trim();

    // Only keep chunks that meet minimum size requirement
    if (content.length >= minChunkSize) {
      // Determine section path for this chunk's position
      const sectionPath = mdStructure ? getSectionPath(mdStructure.sections, start) : undefined;

      // Build contextual content with document structure
      const contentWithContext = mdStructure
        ? buildContextualPrefix(mdStructure.title, sectionPath || []) + content
        : content;

      chunks.push({
        content,
        contentWithContext,
        index: chunks.length,
        metadata: {
          sourceFile,
          chunkIndex: chunks.length,
          totalChunks: 0, // Will be set after all chunks are created
          documentTitle: mdStructure?.title,
          sectionPath,
        },
      });
    }

    // Move start for next chunk (with overlap)
    // Ensure start always advances to prevent infinite loops
    start = Math.max(start + 1, end - overlap);
    if (start >= text.length) break;
  }

  // Update totalChunks in all chunk metadata
  const totalChunks = chunks.length;
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = totalChunks;
  }

  return chunks;
}

/**
 * Find a sentence break point (., !, ?) followed by whitespace.
 */
function findSentenceBreak(text: string, minPos: number, maxPos: number): number {
  const searchText = text.slice(minPos, maxPos);

  // Look for sentence endings from the end
  for (let i = searchText.length - 1; i >= 0; i--) {
    const char = searchText[i];
    if ((char === "." || char === "!" || char === "?") && i < searchText.length - 1) {
      const nextChar = searchText[i + 1];
      if (nextChar === " " || nextChar === "\n" || nextChar === "\t") {
        return minPos + i + 1;
      }
    }
  }

  return -1;
}

/**
 * Chunk multiple files and return all chunks with file metadata.
 */
export function chunkFiles(files: Array<{ path: string; content: string }>, options: ChunkOptions = {}): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const file of files) {
    const chunks = chunkText(file.content, file.path, options);
    allChunks.push(...chunks);
  }

  return allChunks;
}
