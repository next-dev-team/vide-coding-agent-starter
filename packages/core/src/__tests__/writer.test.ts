import { describe, it, expect } from "vitest";
import {
  padId,
  sanitizeSlug,
  taskFilename,
  prdFilename,
  adrFilename,
  writeTask,
  writePrd,
  writeAdr,
} from "../writer.js";

// ─── padId ────────────────────────────────────────────────────────────────────

describe("padId", () => {
  it("pads 1 to 4 digits", () => expect(padId(1)).toBe("0001"));
  it("pads 2 digits", () => expect(padId(42)).toBe("0042"));
  it("leaves 4-digit number unchanged", () => expect(padId(1234)).toBe("1234"));
  it("allows numbers beyond 4 digits", () => expect(padId(10000)).toBe("10000"));
  it("pads zero", () => expect(padId(0)).toBe("0000"));
});

// ─── sanitizeSlug ─────────────────────────────────────────────────────────────

describe("sanitizeSlug", () => {
  it("lowercases input", () => expect(sanitizeSlug("AddTodo")).toBe("addtodo"));
  it("replaces spaces with dashes", () => expect(sanitizeSlug("add todo input")).toBe("add-todo-input"));
  it("replaces multiple spaces with a single dash", () => expect(sanitizeSlug("foo   bar")).toBe("foo-bar"));
  it("strips special characters", () => expect(sanitizeSlug("add @#$% feature!")).toBe("add-feature"));
  it("collapses consecutive dashes", () => expect(sanitizeSlug("foo---bar")).toBe("foo-bar"));
  it("strips leading and trailing dashes", () => expect(sanitizeSlug("-hello-world-")).toBe("hello-world"));
  it("truncates at 60 characters", () => {
    const result = sanitizeSlug("a".repeat(80));
    expect(result).toHaveLength(60);
  });
  it("falls back to 'untitled' for empty string", () => expect(sanitizeSlug("")).toBe("untitled"));
  it("falls back to 'untitled' for special-only input", () => expect(sanitizeSlug("@#$%")).toBe("untitled"));
  it("preserves hyphens between words", () => expect(sanitizeSlug("add-todo-input")).toBe("add-todo-input"));
  it("preserves digits", () => expect(sanitizeSlug("task-2b-done")).toBe("task-2b-done"));
});

// ─── taskFilename ─────────────────────────────────────────────────────────────

describe("taskFilename", () => {
  it("defaults to todo status", () => expect(taskFilename("0001", "add-todo")).toBe("todo-0001-add-todo.md"));
  it("uses provided status", () => expect(taskFilename("0002", "filter-todos", "wip")).toBe("wip-0002-filter-todos.md"));
  it("sanitizes slug with spaces", () => expect(taskFilename("0003", "add todo input")).toBe("todo-0003-add-todo-input.md"));
  it("sanitizes special characters", () => expect(taskFilename("0004", "Add @#$% Feature!")).toBe("todo-0004-add-feature.md"));
  it("handles done status", () => expect(taskFilename("0005", "old-task", "done")).toBe("done-0005-old-task.md"));
});

// ─── prdFilename ─────────────────────────────────────────────────────────────

describe("prdFilename", () => {
  it("generates correct filename", () => expect(prdFilename("0001", "filter-todos")).toBe("0001-filter-todos.md"));
  it("sanitizes title-derived slug", () => expect(prdFilename("0002", "My PRD Title")).toBe("0002-my-prd-title.md"));
  it("strips special chars", () => expect(prdFilename("0003", "feature: v2.0!")).toBe("0003-feature-v2-0.md"));
});

// ─── adrFilename ─────────────────────────────────────────────────────────────

describe("adrFilename", () => {
  it("generates correct filename", () => expect(adrFilename("0001", "use-sqlite")).toBe("0001-use-sqlite.md"));
  it("sanitizes decision title slug", () => expect(adrFilename("0002", "Use SQLite Storage")).toBe("0002-use-sqlite-storage.md"));
});

// ─── writeTask ────────────────────────────────────────────────────────────────

describe("writeTask", () => {
  const base = { id: "0001", title: "Add Input Field", goal: "Allow users to add todos" };

  it("includes heading with id and title", () => {
    const md = writeTask(base);
    expect(md).toContain("# Task 0001: Add Input Field");
  });

  it("includes Goal section with goal text", () => {
    const md = writeTask(base);
    expect(md).toContain("## Goal");
    expect(md).toContain("Allow users to add todos");
  });

  it("includes Acceptance Criteria section", () => {
    const md = writeTask(base);
    expect(md).toContain("## Acceptance Criteria");
  });

  it("uses default acceptance criteria when none provided", () => {
    const md = writeTask(base);
    expect(md).toContain("- [ ] All tests pass");
    expect(md).toContain("- [ ] No lint/type errors");
    expect(md).toContain("- [ ] Public APIs are documented");
  });

  it("uses custom acceptance criteria", () => {
    const md = writeTask({
      ...base,
      acceptance: [
        { checked: false, text: "User can type in the input" },
        { checked: true, text: "Input is cleared on submit" },
      ],
    });
    expect(md).toContain("- [ ] User can type in the input");
    expect(md).toContain("- [x] Input is cleared on submit");
    expect(md).not.toContain("All tests pass");
  });

  it("includes prdRef in blockquote when provided", () => {
    const md = writeTask({ ...base, prdRef: "docs/prd/0001-add-todos.md" });
    expect(md).toContain("> PRD: `docs/prd/0001-add-todos.md`");
  });

  it("uses (none) for prdRef when omitted", () => {
    const md = writeTask(base);
    expect(md).toContain("> PRD: `(none)`");
  });

  it("includes Notes section", () => {
    const md = writeTask(base);
    expect(md).toContain("## Notes");
  });

  it("includes When Done checklist", () => {
    const md = writeTask(base);
    expect(md).toContain("## When Done");
    expect(md).toContain("- [ ] Rename file from `wip-` to `done-`");
  });

  it("includes Created date in ISO format", () => {
    const md = writeTask(base);
    expect(md).toMatch(/> Created: \d{4}-\d{2}-\d{2}/);
  });
});

// ─── writePrd ─────────────────────────────────────────────────────────────────

describe("writePrd", () => {
  const base = { id: "0001", title: "Filter Todos", problem: "Users cannot filter tasks by status" };

  it("includes heading with id and title", () => {
    const md = writePrd(base);
    expect(md).toContain("# PRD-0001: Filter Todos");
  });

  it("includes draft status", () => {
    const md = writePrd(base);
    expect(md).toContain("> Status: draft");
  });

  it("includes Problem section", () => {
    const md = writePrd(base);
    expect(md).toContain("## Problem");
    expect(md).toContain("Users cannot filter tasks by status");
  });

  it("includes User Stories section", () => {
    const md = writePrd(base);
    expect(md).toContain("## User Stories");
  });

  it("includes Acceptance Criteria section", () => {
    const md = writePrd(base);
    expect(md).toContain("## Acceptance Criteria");
  });

  it("includes owner when provided", () => {
    const md = writePrd({ ...base, owner: "Alice" });
    expect(md).toContain("> Owner: Alice");
  });

  it("uses TBD for owner when omitted", () => {
    const md = writePrd(base);
    expect(md).toContain("> Owner: (TBD)");
  });

  it("includes Created date", () => {
    const md = writePrd(base);
    expect(md).toMatch(/> Created: \d{4}-\d{2}-\d{2}/);
  });
});

// ─── writeAdr ─────────────────────────────────────────────────────────────────

describe("writeAdr", () => {
  const base = {
    id: "0001",
    title: "Use SQLite for Memory",
    context: "We need persistent storage without a server dependency.",
    decision: "Use SQLite via better-sqlite3.",
  };

  it("includes heading with id and title", () => {
    const md = writeAdr(base);
    expect(md).toContain("# ADR-0001: Use SQLite for Memory");
  });

  it("includes proposed status", () => {
    const md = writeAdr(base);
    expect(md).toContain("> Status: proposed");
  });

  it("includes Context section", () => {
    const md = writeAdr(base);
    expect(md).toContain("## Context");
    expect(md).toContain("We need persistent storage without a server dependency.");
  });

  it("includes Decision section", () => {
    const md = writeAdr(base);
    expect(md).toContain("## Decision");
    expect(md).toContain("Use SQLite via better-sqlite3.");
  });

  it("includes Consequences section with positive/negative subsections", () => {
    const md = writeAdr(base);
    expect(md).toContain("## Consequences");
    expect(md).toContain("### Positive");
    expect(md).toContain("### Negative / Trade-offs");
  });

  it("renders custom positive consequences", () => {
    const md = writeAdr({ ...base, positive: ["Fast reads", "No server needed"] });
    expect(md).toContain("- Fast reads");
    expect(md).toContain("- No server needed");
  });

  it("renders custom negative consequences", () => {
    const md = writeAdr({ ...base, negative: ["No full-text search without FTS5"] });
    expect(md).toContain("- No full-text search without FTS5");
  });

  it("includes Date in ISO format", () => {
    const md = writeAdr(base);
    expect(md).toMatch(/> Date: \d{4}-\d{2}-\d{2}/);
  });
});
