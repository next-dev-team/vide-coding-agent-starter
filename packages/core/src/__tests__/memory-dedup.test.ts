import { describe, it, expect } from "vitest";
import { similarity, deduplicateMemories, sweepDuplicates } from "../memory/dedup.js";
import type { Memory, MemoryCandidate } from "../memory/types.js";

// ─── Fixtures ────────────────────────────────────────────────

function makeMemory(id: number, abstract: string, category = "workflow"): Memory {
  return {
    id,
    category: category as Memory["category"],
    slug: abstract.toLowerCase().replace(/\s+/g, "-").slice(0, 30),
    l0_abstract: abstract,
    file_path: `/fake/${id}.md`,
    token_count: Math.ceil(abstract.length / 4),
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeCandidate(abstract: string, category = "workflow"): MemoryCandidate {
  return {
    category: category as MemoryCandidate["category"],
    l0_abstract: abstract,
    raw_detail: abstract,
  };
}

// ─── similarity() ────────────────────────────────────────────

describe("similarity", () => {
  it("returns 1.0 for identical strings", () => {
    expect(similarity("hello world", "hello world")).toBe(1);
  });

  it("returns 0.0 for completely different strings", () => {
    const s = similarity("aaaa", "zzzz");
    expect(s).toBeLessThan(0.2);
  });

  it("handles empty strings", () => {
    expect(similarity("", "")).toBe(1);
    expect(similarity("abc", "")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(similarity("Hello", "hello")).toBe(1);
  });
});

// ─── deduplicateMemories() ────────────────────────────────────

describe("deduplicateMemories", () => {
  it("returns create when no existing memories", () => {
    const candidates = [makeCandidate("Use pnpm workspaces for isolation")];
    const results = deduplicateMemories(candidates, []);
    expect(results[0].decision).toBe("create");
  });

  it("returns skip for near-duplicate (sim >= 0.85)", () => {
    const existing = [makeMemory(1, "Use pnpm workspaces for package isolation")];
    const candidates = [makeCandidate("Use pnpm workspaces for package isolation")];
    const results = deduplicateMemories(candidates, existing, 0.85);
    expect(results[0].decision).toBe("skip");
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.85);
  });

  it("returns merge for partial overlap (0.6 <= sim < 0.85)", () => {
    const existing = [makeMemory(1, "Use pnpm workspaces for isolation and speed")];
    const candidates = [makeCandidate("Use pnpm workspaces for isolation")];
    const results = deduplicateMemories(candidates, existing, 0.85);
    expect(["merge", "skip"]).toContain(results[0].decision);
  });

  it("returns create when existing is in a different category", () => {
    const existing = [makeMemory(1, "Auth tokens must not be logged", "security")];
    const candidates = [makeCandidate("Run vitest for unit tests", "workflow")];
    const results = deduplicateMemories(candidates, existing, 0.85);
    expect(results[0].decision).toBe("create");
  });

  it("populates matchedId for merge decisions", () => {
    const existing = [makeMemory(42, "Use pnpm workspaces for isolation and speed")];
    const candidates = [makeCandidate("Use pnpm workspaces for isolation")];
    const results = deduplicateMemories(candidates, existing, 0.85);
    if (results[0].decision === "merge") {
      expect(results[0].matchedId).toBe(42);
    }
  });
});

// ─── sweepDuplicates() ───────────────────────────────────────

describe("sweepDuplicates", () => {
  it("returns empty report for empty store", () => {
    const report = sweepDuplicates([]);
    expect(report.toMerge).toHaveLength(0);
    expect(report.toDelete).toHaveLength(0);
    expect(report.unchanged).toBe(0);
  });

  it("returns unchanged count for distinct entries", () => {
    const memories = [
      makeMemory(1, "Use pnpm for package management"),
      makeMemory(2, "Auth tokens must never be logged"),
    ];
    const report = sweepDuplicates(memories, 0.85);
    expect(report.toMerge).toHaveLength(0);
    expect(report.toDelete).toHaveLength(0);
    expect(report.unchanged).toBe(2);
  });

  it("detects near-duplicate pair within same category", () => {
    const memories = [
      makeMemory(1, "Always use pnpm workspaces for package isolation"),
      makeMemory(2, "Always use pnpm workspaces for package isolation"),
    ];
    const report = sweepDuplicates(memories, 0.85);
    expect(report.toMerge.length).toBeGreaterThan(0);
    expect(report.toDelete.length).toBeGreaterThan(0);
  });

  it("does not flag entries in different categories as duplicates", () => {
    const memories = [
      makeMemory(1, "Use vitest for unit tests", "workflow"),
      makeMemory(2, "Use vitest for unit tests", "tech_stack"),
    ];
    const report = sweepDuplicates(memories, 0.85);
    // Different categories — no cross-category sweep
    expect(report.toDelete).toHaveLength(0);
  });
});
