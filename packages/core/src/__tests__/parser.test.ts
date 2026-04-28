import { describe, it, expect } from "vitest";
import { parseTaskFilename, parseTask, parsePrd, parseAdr } from "../parser.js";
import { writeTask, writePrd, writeAdr } from "../writer.js";

describe("parser", () => {
  describe("parseTaskFilename", () => {
    it("should parse a valid todo task filename", () => {
      const result = parseTaskFilename("todo-0001-add-input.md");
      expect(result).toEqual({
        status: "todo",
        id: "0001",
        slug: "add-input",
      });
    });

    it("should parse a valid wip task filename", () => {
      const result = parseTaskFilename("wip-0002-filter-todos.md");
      expect(result).toEqual({
        status: "wip",
        id: "0002",
        slug: "filter-todos",
      });
    });

    it("should parse a valid done task filename", () => {
      const result = parseTaskFilename("done-0003-persist.md");
      expect(result).toEqual({
        status: "done",
        id: "0003",
        slug: "persist",
      });
    });

    it("should parse a valid blocked task filename", () => {
      const result = parseTaskFilename("blocked-0004-api-integration.md");
      expect(result).toEqual({
        status: "blocked",
        id: "0004",
        slug: "api-integration",
      });
    });

    it("should return null for an invalid prefix", () => {
      const result = parseTaskFilename("invalid-0001-add-input.md");
      expect(result).toBeNull();
    });

    it("should return null for an invalid format", () => {
      const result = parseTaskFilename("random-file.txt");
      expect(result).toBeNull();
    });

    it("returns null for missing extension", () => {
      expect(parseTaskFilename("todo-0001-add-input")).toBeNull();
    });

    it("returns null for unknown status prefix", () => {
      expect(parseTaskFilename("review-0001-add-input.md")).toBeNull();
    });
  });
});

// ─── parseTask ───────────────────────────────────────────────────────────────

describe("parseTask", () => {
  it("roundtrips through writeTask", () => {
    const md = writeTask({
      id: "0001",
      title: "Add Input Field",
      goal: "Allow users to add todos",
      acceptance: [
        { checked: false, text: "Input renders" },
        { checked: true, text: "Clears on submit" },
      ],
    });
    const task = parseTask("todo-0001-add-input-field.md", md);
    expect(task.id).toBe("0001");
    expect(task.slug).toBe("add-input-field");
    expect(task.status).toBe("todo");
    expect(task.goal).toBe("Allow users to add todos");
    expect(task.acceptance).toHaveLength(2);
    expect(task.acceptance[0]).toEqual({ checked: false, text: "Input renders" });
    expect(task.acceptance[1]).toEqual({ checked: true, text: "Clears on submit" });
  });

  it("parses prdRef from blockquote", () => {
    const md = writeTask({ id: "0001", title: "T", goal: "G", prdRef: "docs/prd/0001-feature.md" });
    const task = parseTask("wip-0001-t.md", md);
    expect(task.prdRef).toBe("docs/prd/0001-feature.md");
  });

  it("returns null prdRef when (none)", () => {
    const md = writeTask({ id: "0001", title: "T", goal: "G" });
    const task = parseTask("todo-0001-t.md", md);
    expect(task.prdRef).toBeNull();
  });

  it("parses created date", () => {
    const md = writeTask({ id: "0001", title: "T", goal: "G" });
    const task = parseTask("todo-0001-t.md", md);
    expect(task.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("parses approach bullets", () => {
    const md = writeTask({ id: "0001", title: "T", goal: "G", approach: ["Step one", "Step two"] });
    const task = parseTask("todo-0001-t.md", md);
    expect(task.approach).toContain("Step one");
    expect(task.approach).toContain("Step two");
  });

  it("throws on invalid filename", () => {
    expect(() => parseTask("invalid.md", "# content")).toThrow("Invalid task filename");
  });

  it("preserves raw markdown", () => {
    const md = writeTask({ id: "0001", title: "T", goal: "G" });
    const task = parseTask("todo-0001-t.md", md);
    expect(task.raw).toBe(md);
  });
});

// ─── parsePrd ────────────────────────────────────────────────────────────────

describe("parsePrd", () => {
  it("roundtrips through writePrd", () => {
    const md = writePrd({
      id: "0001",
      title: "Filter Todos",
      problem: "Users cannot filter by status",
      owner: "Alice",
    });
    const prd = parsePrd("0001-filter-todos.md", md);
    expect(prd.id).toBe("0001");
    expect(prd.title).toBe("PRD-0001: Filter Todos");
    expect(prd.status).toBe("draft");
    expect(prd.owner).toBe("Alice");
    expect(prd.problem).toContain("Users cannot filter by status");
  });

  it("defaults status to draft when not present", () => {
    const md = "# My PRD\n\n## Problem\n\nSome problem\n";
    const prd = parsePrd("0001-my-prd.md", md);
    expect(prd.status).toBe("draft");
  });

  it("parses acceptance criteria", () => {
    const md = writePrd({
      id: "0001", title: "T", problem: "P",
      acceptance: [{ checked: false, text: "Feature works" }],
    });
    const prd = parsePrd("0001-t.md", md);
    expect(prd.acceptance).toHaveLength(1);
    expect(prd.acceptance[0].text).toBe("Feature works");
  });

  it("throws on invalid filename", () => {
    expect(() => parsePrd("not-a-prd", "# content")).toThrow("Invalid PRD filename");
  });
});

// ─── parseAdr ────────────────────────────────────────────────────────────────

describe("parseAdr", () => {
  it("roundtrips through writeAdr", () => {
    const md = writeAdr({
      id: "0001",
      title: "Use SQLite",
      context: "We need embedded storage",
      decision: "Use better-sqlite3",
    });
    const adr = parseAdr("0001-use-sqlite.md", md);
    expect(adr.id).toBe("0001");
    expect(adr.title).toBe("ADR-0001: Use SQLite");
    expect(adr.status).toBe("proposed");
    expect(adr.context).toContain("We need embedded storage");
    expect(adr.decision).toContain("Use better-sqlite3");
  });

  it("parses decision date", () => {
    const md = writeAdr({ id: "0001", title: "T", context: "C", decision: "D" });
    const adr = parseAdr("0001-t.md", md);
    expect(adr.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults status to proposed when not present", () => {
    const md = "# ADR\n\n## Context\n\nC\n\n## Decision\n\nD\n";
    const adr = parseAdr("0001-adr.md", md);
    expect(adr.status).toBe("proposed");
  });

  it("throws on invalid filename", () => {
    expect(() => parseAdr("not-valid", "# content")).toThrow("Invalid ADR filename");
  });
});
