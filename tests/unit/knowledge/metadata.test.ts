import { describe, it } from "node:test";
import assert from "node:assert";
import { extractMarkdownStructure, findSectionAtPosition, getSectionPath, buildContextualPrefix } from "../../../src/knowledge/ingest/metadata.js";

describe("Markdown metadata extraction", () => {
  it("should extract document title from first H1", () => {
    const markdown = `# API Guide\n\nSome content here.\n\n## Section 1\n\nMore content.`;
    const structure = extractMarkdownStructure(markdown, "test.md");

    assert.strictEqual(structure.title, "API Guide");
  });

  it("should use filename as title when no H1 exists", () => {
    const markdown = `## Section 1\n\nContent without H1.`;
    const structure = extractMarkdownStructure(markdown, "my-doc.md");

    assert.strictEqual(structure.title, "my-doc");
  });

  it("should extract hierarchical section structure", () => {
    const markdown = `# Main Title\n\n## Section A\n\nContent A.\n\n### Subsection A1\n\nContent A1.\n\n## Section B\n\nContent B.`;
    const structure = extractMarkdownStructure(markdown, "test.md");

    assert.strictEqual(structure.sections.length, 4);
    assert.strictEqual(structure.sections[0]!.heading, "Main Title");
    assert.strictEqual(structure.sections[0]!.level, 1);
    assert.deepStrictEqual(structure.sections[0]!.path, []);

    assert.strictEqual(structure.sections[1]!.heading, "Section A");
    assert.strictEqual(structure.sections[1]!.level, 2);
    assert.deepStrictEqual(structure.sections[1]!.path, ["Main Title"]);

    assert.strictEqual(structure.sections[2]!.heading, "Subsection A1");
    assert.strictEqual(structure.sections[2]!.level, 3);
    assert.deepStrictEqual(structure.sections[2]!.path, ["Main Title", "Section A"]);

    assert.strictEqual(structure.sections[3]!.heading, "Section B");
    assert.strictEqual(structure.sections[3]!.level, 2);
    assert.deepStrictEqual(structure.sections[3]!.path, ["Main Title"]);
  });

  it("should find section at position", () => {
    const markdown = `# Title\n\n## Section A\n\nContent.\n\n## Section B\n\nMore content.`;
    const structure = extractMarkdownStructure(markdown, "test.md");

    // Position in Section A content
    const sectionA = findSectionAtPosition(structure.sections, 25);
    assert.strictEqual(sectionA?.heading, "Section A");

    // Position in Section B content (use 50 which is within Section B)
    const sectionB = findSectionAtPosition(structure.sections, 50);
    assert.strictEqual(sectionB?.heading, "Section B");
  });

  it("should get full section path at position", () => {
    const markdown = `# Title\n\n## Section A\n\n### Subsection A1\n\nContent here.`;
    const structure = extractMarkdownStructure(markdown, "test.md");

    const path = getSectionPath(structure.sections, 50);
    assert.deepStrictEqual(path, ["Title", "Section A", "Subsection A1"]);
  });

  it("should build contextual prefix", () => {
    const prefix = buildContextualPrefix("API Guide", ["Authentication", "OAuth"]);
    assert.strictEqual(prefix, "# API Guide\n## Authentication > OAuth\n\n");
  });

  it("should build contextual prefix with empty section path", () => {
    const prefix = buildContextualPrefix("API Guide", []);
    assert.strictEqual(prefix, "# API Guide\n\n");
  });

  it("should handle markdown with no headers", () => {
    const markdown = `Just plain text with no headers at all.`;
    const structure = extractMarkdownStructure(markdown, "plain.md");

    assert.strictEqual(structure.title, "plain");
    assert.strictEqual(structure.sections.length, 0);
  });

  it("should handle nested section hierarchy correctly", () => {
    const markdown = `# Root\n## L2-A\n### L3-A1\n#### L4-A1a\n### L3-A2\n## L2-B`;
    const structure = extractMarkdownStructure(markdown, "test.md");

    const l4Section = structure.sections.find(s => s.heading === "L4-A1a");
    assert.deepStrictEqual(l4Section?.path, ["Root", "L2-A", "L3-A1"]);

    const l3A2Section = structure.sections.find(s => s.heading === "L3-A2");
    assert.deepStrictEqual(l3A2Section?.path, ["Root", "L2-A"]);

    const l2BSection = structure.sections.find(s => s.heading === "L2-B");
    assert.deepStrictEqual(l2BSection?.path, ["Root"]);
  });
});
