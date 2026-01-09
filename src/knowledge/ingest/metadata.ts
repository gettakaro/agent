/**
 * Markdown metadata extraction utilities.
 * Extracts document structure (title, headers, section paths) from markdown content.
 */

export interface MarkdownStructure {
  /** Document title (first H1 heading, or filename if no H1) */
  title: string;
  /** Hierarchical section structure */
  sections: Section[];
}

export interface Section {
  /** Heading text */
  heading: string;
  /** Heading level (1-6) */
  level: number;
  /** Starting position in document (character index) */
  startPos: number;
  /** Ending position in document (character index, exclusive) */
  endPos: number;
  /** Path from document root (e.g., ["Installation", "Docker Setup"]) */
  path: string[];
}

/**
 * Extract markdown structure from document content.
 * Parses headings and builds hierarchical section tree.
 *
 * @example
 * const md = "# API Guide\n## Authentication\nContent...\n## Endpoints\nMore...";
 * const structure = extractMarkdownStructure(md, "api.md");
 * // structure.title = "API Guide"
 * // structure.sections = [
 * //   { heading: "API Guide", level: 1, path: [], ... },
 * //   { heading: "Authentication", level: 2, path: ["API Guide"], ... },
 * //   { heading: "Endpoints", level: 2, path: ["API Guide"], ... }
 * // ]
 */
export function extractMarkdownStructure(content: string, filename: string): MarkdownStructure {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const sections: Section[] = [];
  const headerStack: Array<{ level: number; heading: string }> = [];

  let title = filename.replace(/\.md$/, ""); // Default title from filename

  // Extract all headings
  let match = headingRegex.exec(content);
  while (match !== null) {
    const level = match[1]!.length;
    const heading = match[2]!.trim();
    const startPos = match.index;

    // Update endPos of previous section
    if (sections.length > 0) {
      sections[sections.length - 1]!.endPos = startPos;
    }

    // First H1 becomes document title
    if (level === 1 && sections.length === 0) {
      title = heading;
    }

    // Build section path from header stack
    // Pop headers at same or deeper level
    while (headerStack.length > 0 && headerStack[headerStack.length - 1]!.level >= level) {
      headerStack.pop();
    }

    // Current path is all headers above current level
    const path = headerStack.map((h) => h.heading);

    sections.push({
      heading,
      level,
      startPos,
      endPos: content.length, // Will be updated by next section or stay as doc end
      path,
    });

    // Push current header to stack for child sections
    headerStack.push({ level, heading });

    // Get next match
    match = headingRegex.exec(content);
  }

  return {
    title,
    sections,
  };
}

/**
 * Find the section that contains a given position in the document.
 *
 * @param sections - Sections from extractMarkdownStructure
 * @param position - Character position in document
 * @returns The deepest section containing this position, or null if not in any section
 */
export function findSectionAtPosition(sections: Section[], position: number): Section | null {
  // Find deepest section containing position
  let deepestSection: Section | null = null;
  let maxLevel = 0;

  for (const section of sections) {
    if (position >= section.startPos && position < section.endPos) {
      if (section.level > maxLevel) {
        deepestSection = section;
        maxLevel = section.level;
      }
    }
  }

  return deepestSection;
}

/**
 * Get the full section path for a position in the document.
 * Returns array of section headings from root to leaf.
 *
 * @example
 * const path = getSectionPath(sections, 500);
 * // path = ["API Guide", "Authentication", "OAuth"]
 */
export function getSectionPath(sections: Section[], position: number): string[] {
  const section = findSectionAtPosition(sections, position);
  if (!section) return [];

  // Return path including current section
  return [...section.path, section.heading];
}

/**
 * Build contextual prefix for a chunk based on document structure.
 * Prepends document title and section path as markdown headers.
 *
 * @param title - Document title
 * @param sectionPath - Array of section headings leading to chunk
 * @returns Markdown-formatted context prefix
 *
 * @example
 * buildContextualPrefix("API Guide", ["Authentication", "OAuth"])
 * // Returns: "# API Guide\n## Authentication > OAuth\n\n"
 */
export function buildContextualPrefix(title: string, sectionPath: string[]): string {
  if (sectionPath.length === 0) {
    return `# ${title}\n\n`;
  }

  const sectionLine = sectionPath.join(" > ");
  return `# ${title}\n## ${sectionLine}\n\n`;
}
