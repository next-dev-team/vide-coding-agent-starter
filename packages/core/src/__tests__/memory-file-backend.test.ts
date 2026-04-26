import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryFileBackend } from "../memory/file-backend.js";
import type { DedupResult } from "../memory/types.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeCreateResult(
  category: DedupResult["candidate"]["category"],
  abstract: string,
  detail: string,
): DedupResult {
  return {
    decision: "create",
    candidate: { category, l0_abstract: abstract, raw_detail: detail },
    similarity: 0,
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("MemoryFileBackend", () => {
  let tmpDir: string;
  let backend: MemoryFileBackend;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "ak-file-backend-"));
    backend = new MemoryFileBackend(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("apply(create) writes a markdown file under docs/memory/<category>/", () => {
    backend.apply([
      makeCreateResult("architecture", "Use pnpm workspaces for isolation", "Full detail here."),
    ]);

    const memories = backend.overview();
    expect(memories).toHaveLength(1);
    expect(memories[0].category).toBe("architecture");
    expect(memories[0].l0_abstract).toBe("Use pnpm workspaces for isolation");
  });

  it("overview() returns L0 fields only — no body content", () => {
    backend.apply([
      makeCreateResult("workflow", "Always run pnpm build before done", "Detail text for the build step."),
    ]);

    const mems = backend.overview();
    expect(mems).toHaveLength(1);
    const m = mems[0];
    // L0 fields present
    expect(m).toHaveProperty("id");
    expect(m).toHaveProperty("category");
    expect(m).toHaveProperty("slug");
    expect(m).toHaveProperty("l0_abstract");
    expect(m).toHaveProperty("file_path");
    expect(m).toHaveProperty("token_count");
    // No body / raw_detail field
    expect((m as unknown as Record<string, unknown>).raw_detail).toBeUndefined();
  });

  it("find() keyword matches abstract (case-insensitive)", () => {
    backend.apply([
      makeCreateResult("tech_stack", "TypeScript 5 with strict mode", "Detail."),
      makeCreateResult("bugs", "FTS5 requires proper triggers", "Detail."),
    ]);

    const results = backend.find("typescript");
    expect(results).toHaveLength(1);
    expect(results[0].l0_abstract).toMatch(/TypeScript/i);
  });

  it("find() returns no results for unmatched query", () => {
    backend.apply([makeCreateResult("code_style", "Use kebab-case filenames", "Detail.")]);
    expect(backend.find("nonexistent-query-xyz")).toHaveLength(0);
  });

  it("read() returns full body including frontmatter", () => {
    backend.apply([
      makeCreateResult("security", "Never log passwords", "Full L2 security detail here."),
    ]);

    const mems = backend.overview();
    expect(mems).toHaveLength(1);

    const content = backend.read(mems[0].file_path);
    expect(content).toContain("Full L2 security detail here.");
    expect(content).toContain("---"); // frontmatter present
  });

  it("read() by numeric ID resolves to file content", () => {
    backend.apply([makeCreateResult("performance", "Batch DB writes in transactions", "Details.")]);

    const mems = backend.overview();
    const content = backend.read(String(mems[0].id));
    expect(content).toContain("Details.");
  });

  it("apply(delete) removes the file", () => {
    backend.apply([makeCreateResult("bugs", "Known issue: timer leak", "Fix: clear on unmount.")]);

    const before = backend.overview();
    expect(before).toHaveLength(1);

    backend.apply([
      {
        decision: "delete",
        candidate: { category: "bugs", l0_abstract: "Known issue: timer leak", raw_detail: "" },
        matchedId: before[0].id,
        similarity: 1,
      },
    ]);

    const after = backend.overview();
    expect(after).toHaveLength(0);
  });

  it("apply(skip) is a no-op", () => {
    backend.apply([
      {
        decision: "skip",
        candidate: { category: "domain", l0_abstract: "User is the unit", raw_detail: "" },
        similarity: 0.95,
      },
    ]);
    expect(backend.overview()).toHaveLength(0);
  });

  it("overview() is sorted by category then slug", () => {
    backend.apply([
      makeCreateResult("workflow", "Zz last workflow item", "d"),
      makeCreateResult("architecture", "Aa first arch item", "d"),
      makeCreateResult("workflow", "Aa first workflow item", "d"),
    ]);

    const mems = backend.overview();
    expect(mems[0].category).toBe("architecture");
    expect(mems[1].category).toBe("workflow");
    expect(mems[1].slug < mems[2].slug).toBe(true); // sorted within workflow
  });

  it("close() is a no-op (no error thrown)", () => {
    expect(() => backend.close()).not.toThrow();
  });
});
