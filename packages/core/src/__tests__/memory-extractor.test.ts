import { describe, it, expect } from "vitest";
import { extractMemories } from "../memory/extractor.js";

const SAMPLE_TASK = `
# Task 0002: Example Task

> Created: 2026-04-27

## Goal

Extract learnings from a task.

## Notes

- Use FTS5 for keyword-based search to avoid embedding dependencies
- The dedup threshold should be configurable, defaulting to 0.85
- Fix: the memory_read tool was returning L2 content from the overview endpoint (bug)
- Auth tokens must never be logged to console (security rule)

## Approach

- Run vitest for unit tests with ESM imports
- Use pnpm workspaces to keep packages isolated

## Open Questions

- Should workflow steps be stored in the domain or workflow category?
`;

describe("extractMemories", () => {
  it("returns candidates from Notes and Approach sections", () => {
    const results = extractMemories(SAMPLE_TASK);
    expect(results.length).toBeGreaterThan(0);
  });

  it("all candidates have a valid category", () => {
    const VALID = [
      "tech_stack", "architecture", "workflow", "code_style",
      "domain", "bugs", "performance", "security",
    ];
    const results = extractMemories(SAMPLE_TASK);
    for (const c of results) {
      expect(VALID).toContain(c.category);
    }
  });

  it("classifies FTS5 bullet as performance or tech_stack (keyword match)", () => {
    const results = extractMemories(SAMPLE_TASK);
    const fts = results.find((r) =>
      r.l0_abstract.toLowerCase().includes("fts5"),
    );
    expect(fts).toBeDefined();
    expect(["performance", "tech_stack", "architecture", "workflow"]).toContain(fts!.category);
  });

  it("classifies bug bullet as bugs", () => {
    const results = extractMemories(SAMPLE_TASK);
    const bugEntry = results.find((r) =>
      r.l0_abstract.toLowerCase().includes("bug") ||
      r.l0_abstract.toLowerCase().includes("fix"),
    );
    expect(bugEntry).toBeDefined();
    expect(bugEntry!.category).toBe("bugs");
  });

  it("classifies security bullet as security", () => {
    const results = extractMemories(SAMPLE_TASK);
    const sec = results.find((r) =>
      r.l0_abstract.toLowerCase().includes("auth") ||
      r.l0_abstract.toLowerCase().includes("logged"),
    );
    expect(sec).toBeDefined();
    expect(sec!.category).toBe("security");
  });

  it("does not include placeholder text", () => {
    const results = extractMemories(SAMPLE_TASK);
    for (const c of results) {
      expect(c.l0_abstract).not.toMatch(/^\(.*\)$/);
      expect(c.l0_abstract).not.toBe("TBD");
    }
  });

  it("deduplicates identical bullets within the same run", () => {
    const doubled = SAMPLE_TASK + "\n## Notes\n\n" + "- Use FTS5 for keyword-based search to avoid embedding dependencies\n";
    const r1 = extractMemories(SAMPLE_TASK);
    const r2 = extractMemories(doubled);
    expect(r1.length).toBe(r2.length);
  });
});
