import { describe, it } from "node:test";
import assert from "node:assert";
import { chunkText } from "../../../src/knowledge/ingest/chunker.js";

describe("Contextual chunking", () => {
  it("should create chunks with contextual metadata for markdown files", () => {
    const markdown = `# API Guide\n\n## Authentication\n\nYou can authenticate using API keys or OAuth tokens.\n\n## Endpoints\n\n### GET /users\n\nReturns a list of users.`;

    const chunks = chunkText(markdown, "api.md", { chunkSize: 100, overlap: 20 });

    assert.ok(chunks.length > 0, "Should create at least one chunk");

    // First chunk should have document title
    assert.strictEqual(chunks[0]!.metadata.documentTitle, "API Guide");
    assert.ok(chunks[0]!.metadata.sectionPath, "Should have section path");

    // Content with context should include document structure
    assert.ok(chunks[0]!.contentWithContext.includes("# API Guide"), "Should include title in contextual content");
  });

  it("should include section path in chunk metadata", () => {
    const markdown = `# Guide\n\n## Setup\n\n### Installation\n\nRun npm install to get started with this amazing project. Follow the instructions.`;

    const chunks = chunkText(markdown, "guide.md", { chunkSize: 100, overlap: 20, minChunkSize: 10 });

    assert.ok(chunks.length > 0, "Should create chunks");

    // Find chunk containing "instructions" which will be in Installation section
    const installChunk = chunks.find(c => c.content.includes("instructions"));
    assert.ok(installChunk, "Should find chunk in installation section");
    assert.deepStrictEqual(installChunk!.metadata.sectionPath, ["Guide", "Setup", "Installation"]);
  });

  it("should create overlapping chunks", () => {
    const text = "A".repeat(150) + "B".repeat(150);
    const chunks = chunkText(text, "test.txt", { chunkSize: 100, overlap: 20 });

    assert.ok(chunks.length >= 2, "Should create multiple chunks");

    // Check that chunks overlap
    const firstEnd = chunks[0]!.content.slice(-10);
    const secondStart = chunks[1]!.content.slice(0, 20);
    assert.ok(secondStart.includes(firstEnd.charAt(0)), "Chunks should overlap");
  });

  it("should respect minimum chunk size", () => {
    const text = "Short text that creates a small final chunk.";
    const chunks = chunkText(text, "test.txt", { chunkSize: 20, overlap: 5, minChunkSize: 15 });

    // All chunks should be at least minChunkSize
    for (const chunk of chunks) {
      assert.ok(chunk.content.length >= 15 || chunk.content.length === text.length,
        "Chunks should meet minimum size or be the only chunk");
    }
  });

  it("should set correct chunk metadata", () => {
    const text = "A".repeat(300);
    const chunks = chunkText(text, "test.txt", { chunkSize: 100, overlap: 20 });

    for (let i = 0; i < chunks.length; i++) {
      assert.strictEqual(chunks[i]!.metadata.sourceFile, "test.txt");
      assert.strictEqual(chunks[i]!.metadata.chunkIndex, i);
      assert.strictEqual(chunks[i]!.metadata.totalChunks, chunks.length);
      assert.strictEqual(chunks[i]!.index, i);
    }
  });

  it("should handle single chunk case", () => {
    const text = "Short text.";
    const chunks = chunkText(text, "test.txt", { chunkSize: 1000 });

    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0]!.content, text.trim());
    assert.strictEqual(chunks[0]!.metadata.chunkIndex, 0);
    assert.strictEqual(chunks[0]!.metadata.totalChunks, 1);
  });

  it("should prefer paragraph breaks for chunk boundaries", () => {
    const text = "Paragraph 1 text here with some content.\n\nParagraph 2 text here with more content.\n\nParagraph 3 text here with even more content to ensure multiple chunks.";
    const chunks = chunkText(text, "test.txt", { chunkSize: 80, overlap: 15 });

    // Check that chunks are created
    assert.ok(chunks.length > 1, "Should create multiple chunks");

    // Check that chunks tend to end at paragraph boundaries (double newline)
    const endsAtParagraph = chunks.slice(0, -1).some(c => {
      const trimmed = c.content.trimEnd();
      return trimmed.endsWith("\n\n") || trimmed.includes("\n\n");
    });
    assert.ok(endsAtParagraph || chunks.length === 1, "Should try to break at paragraph boundaries when possible");
  });

  it("should prepend contextual prefix for markdown chunks", () => {
    const markdown = `# Main\n\n## Section\n\nContent here.`;
    const chunks = chunkText(markdown, "test.md", { chunkSize: 50, overlap: 10 });

    const contentChunk = chunks.find(c => c.content.includes("Content"));
    assert.ok(contentChunk, "Should find content chunk");

    // Contextual content should have title and section
    assert.ok(contentChunk!.contentWithContext.includes("# Main"), "Should include title");
    assert.ok(contentChunk!.contentWithContext.includes("Section"), "Should include section");
  });

  it("should not add contextual prefix for non-markdown files", () => {
    const text = "Plain text file content.";
    const chunks = chunkText(text, "file.txt", { chunkSize: 100 });

    assert.strictEqual(chunks[0]!.content, chunks[0]!.contentWithContext.trim());
    assert.strictEqual(chunks[0]!.metadata.documentTitle, undefined);
    assert.strictEqual(chunks[0]!.metadata.sectionPath, undefined);
  });

  it("should handle empty section path", () => {
    const markdown = "Content without headers.";
    const chunks = chunkText(markdown, "test.md", { chunkSize: 100 });

    assert.ok(chunks[0]!.metadata.documentTitle); // Should have title from filename
    assert.ok(!chunks[0]!.metadata.sectionPath || chunks[0]!.metadata.sectionPath.length === 0);
  });
});
