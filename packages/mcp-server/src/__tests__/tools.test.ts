/**
 * Integration tests for MCP tool handlers.
 * Each test uses a real temp directory that mirrors the expected project structure.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handleToolCall } from "../tools/index.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupProject(root: string) {
  mkdirSync(join(root, "docs", "tasks", "done"), { recursive: true });
  mkdirSync(join(root, "docs", "prd"), { recursive: true });
  mkdirSync(join(root, "docs", "decisions"), { recursive: true });
}

function call(name: string, args: Record<string, unknown> = {}) {
  return handleToolCall(name, args);
}

function text(result: Awaited<ReturnType<typeof handleToolCall>>): string {
  return result.content[0].text;
}

function json(result: Awaited<ReturnType<typeof handleToolCall>>) {
  return JSON.parse(text(result));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

let TMP: string;

beforeEach(() => {
  TMP = mkdtempSync(join(tmpdir(), "ak-mcp-test-"));
  setupProject(TMP);
});

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

// ─── board_list ──────────────────────────────────────────────────────────────

describe("board_list", () => {
  it("returns board with four columns on empty project", async () => {
    const result = await call("board_list", { project_path: TMP });
    const board = json(result);
    expect(board.columns).toHaveLength(4);
    expect(board.columns.map((c: { status: string }) => c.status)).toEqual(["todo", "wip", "done", "blocked"]);
    expect(board.totalTasks).toBe(0);
  });

  it("reflects tasks after creation", async () => {
    await call("task_create", { project_path: TMP, slug: "test-task", goal: "Test the board" });
    const board = json(await call("board_list", { project_path: TMP }));
    expect(board.totalTasks).toBe(1);
    expect(board.columns.find((c: { status: string }) => c.status === "todo").tasks).toHaveLength(1);
  });
});

// ─── next_id ─────────────────────────────────────────────────────────────────

describe("next_id", () => {
  it("returns 0001 for empty task directory", async () => {
    const result = await call("next_id", { project_path: TMP, doc_type: "task" });
    expect(json(result)).toMatchObject({ next_id: "0001", doc_type: "task" });
  });

  it("returns 0001 for empty prd directory", async () => {
    const result = await call("next_id", { project_path: TMP, doc_type: "prd" });
    expect(json(result)).toMatchObject({ next_id: "0001", doc_type: "prd" });
  });

  it("increments after a task is created", async () => {
    await call("task_create", { project_path: TMP, slug: "first", goal: "First task" });
    const result = await call("next_id", { project_path: TMP, doc_type: "task" });
    expect(json(result).next_id).toBe("0002");
  });
});

// ─── task_create ─────────────────────────────────────────────────────────────

describe("task_create", () => {
  it("creates a task file with todo- prefix", async () => {
    const result = await call("task_create", {
      project_path: TMP,
      slug: "add-input-field",
      goal: "Allow users to add todos",
    });
    const { created, id } = json(result);
    expect(created).toBe("todo-0001-add-input-field.md");
    expect(id).toBe("0001");
    expect(existsSync(join(TMP, "docs", "tasks", created))).toBe(true);
  });

  it("sanitizes slug with special characters", async () => {
    const result = await call("task_create", {
      project_path: TMP,
      slug: "Add @#$% Feature!",
      goal: "G",
    });
    const { created } = json(result);
    expect(created).toBe("todo-0001-add-feature.md");
  });

  it("task file contains the goal text", async () => {
    await call("task_create", {
      project_path: TMP,
      slug: "goal-test",
      goal: "This is the task goal",
    });
    const content = readFileSync(join(TMP, "docs", "tasks", "todo-0001-goal-test.md"), "utf-8");
    expect(content).toContain("This is the task goal");
  });

  it("writes custom acceptance criteria to file", async () => {
    await call("task_create", {
      project_path: TMP,
      slug: "criteria-test",
      goal: "G",
      acceptance: ["User sees a form", "Form submits correctly"],
    });
    const content = readFileSync(join(TMP, "docs", "tasks", "todo-0001-criteria-test.md"), "utf-8");
    expect(content).toContain("- [ ] User sees a form");
    expect(content).toContain("- [ ] Form submits correctly");
  });

  it("assigns sequential ids to multiple tasks", async () => {
    await call("task_create", { project_path: TMP, slug: "first", goal: "G" });
    await call("task_create", { project_path: TMP, slug: "second", goal: "G" });
    const result = await call("task_create", { project_path: TMP, slug: "third", goal: "G" });
    expect(json(result).id).toBe("0003");
  });
});

// ─── task_move ───────────────────────────────────────────────────────────────

describe("task_move", () => {
  it("moves task from todo to wip", async () => {
    await call("task_create", { project_path: TMP, slug: "my-task", goal: "G" });
    const result = await call("task_move", { project_path: TMP, task_id: "0001", new_status: "wip" });
    expect(json(result)).toMatchObject({ moved: true, newFilename: "wip-0001-my-task.md" });
    expect(existsSync(join(TMP, "docs", "tasks", "wip-0001-my-task.md"))).toBe(true);
    expect(existsSync(join(TMP, "docs", "tasks", "todo-0001-my-task.md"))).toBe(false);
  });

  it("moves task from wip to done (goes to done/ subfolder)", async () => {
    await call("task_create", { project_path: TMP, slug: "done-task", goal: "G" });
    await call("task_move", { project_path: TMP, task_id: "0001", new_status: "wip" });
    await call("task_move", { project_path: TMP, task_id: "0001", new_status: "done" });
    expect(existsSync(join(TMP, "docs", "tasks", "done", "done-0001-done-task.md"))).toBe(true);
  });

  it("returns error text when task not found", async () => {
    const result = await call("task_move", { project_path: TMP, task_id: "9999", new_status: "done" });
    expect(text(result)).toContain("9999");
  });
});

// ─── task_read ───────────────────────────────────────────────────────────────

describe("task_read", () => {
  it("returns parsed task JSON", async () => {
    await call("task_create", { project_path: TMP, slug: "read-me", goal: "Read this task" });
    const result = await call("task_read", { project_path: TMP, task_id: "0001" });
    const task = json(result);
    expect(task.id).toBe("0001");
    expect(task.slug).toBe("read-me");
    expect(task.status).toBe("todo");
    expect(task.goal).toBe("Read this task");
  });

  it("returns error text when task id not found", async () => {
    const result = await call("task_read", { project_path: TMP, task_id: "9999" });
    expect(text(result)).toContain("9999");
  });
});

// ─── task_update ─────────────────────────────────────────────────────────────

describe("task_update", () => {
  it("ticks an acceptance criterion", async () => {
    await call("task_create", { project_path: TMP, slug: "tick-test", goal: "G" });
    await call("task_update", {
      project_path: TMP,
      task_id: "0001",
      action: "tick",
      criterion_index: 0,
    });
    const content = readFileSync(join(TMP, "docs", "tasks", "todo-0001-tick-test.md"), "utf-8");
    const checkboxes = [...content.matchAll(/^-\s+\[([ xX])\]/gm)];
    expect(checkboxes[0][1]).toBe("x");
  });

  it("unticks a ticked criterion", async () => {
    await call("task_create", { project_path: TMP, slug: "untick-test", goal: "G" });
    await call("task_update", { project_path: TMP, task_id: "0001", action: "tick", criterion_index: 0 });
    await call("task_update", { project_path: TMP, task_id: "0001", action: "untick", criterion_index: 0 });
    const content = readFileSync(join(TMP, "docs", "tasks", "todo-0001-untick-test.md"), "utf-8");
    const checkboxes = [...content.matchAll(/^-\s+\[([ xX])\]/gm)];
    expect(checkboxes[0][1]).toBe(" ");
  });

  it("adds a note to the Notes section", async () => {
    await call("task_create", { project_path: TMP, slug: "note-test", goal: "G" });
    await call("task_update", {
      project_path: TMP,
      task_id: "0001",
      action: "add_note",
      note: "Found a better approach using FTS5",
    });
    const content = readFileSync(join(TMP, "docs", "tasks", "todo-0001-note-test.md"), "utf-8");
    expect(content).toContain("- Found a better approach using FTS5");
  });
});

// ─── prd_create ──────────────────────────────────────────────────────────────

describe("prd_create", () => {
  it("creates a PRD file in docs/prd/", async () => {
    const result = await call("prd_create", {
      project_path: TMP,
      title: "Filter Todos",
      problem: "Users cannot filter tasks by status",
    });
    const { created } = json(result);
    expect(created).toBe("0001-filter-todos.md");
    expect(existsSync(join(TMP, "docs", "prd", created))).toBe(true);
  });

  it("PRD file contains problem statement", async () => {
    await call("prd_create", {
      project_path: TMP,
      title: "My Feature",
      problem: "The specific problem to solve",
    });
    const content = readFileSync(join(TMP, "docs", "prd", "0001-my-feature.md"), "utf-8");
    expect(content).toContain("The specific problem to solve");
  });

  it("sanitizes title into slug for filename", async () => {
    const result = await call("prd_create", {
      project_path: TMP,
      title: "Feature: v2.0 Launch!",
      problem: "P",
    });
    expect(json(result).created).toBe("0001-feature-v2-0-launch.md");
  });
});

// ─── prd_list ────────────────────────────────────────────────────────────────

describe("prd_list", () => {
  it("returns empty array on empty project", async () => {
    const result = await call("prd_list", { project_path: TMP });
    expect(json(result)).toHaveLength(0);
  });

  it("lists created PRDs with id and title", async () => {
    await call("prd_create", { project_path: TMP, title: "Feature A", problem: "P" });
    await call("prd_create", { project_path: TMP, title: "Feature B", problem: "P" });
    const list = json(await call("prd_list", { project_path: TMP }));
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe("0001");
    expect(list[1].id).toBe("0002");
  });
});

// ─── adr_create ──────────────────────────────────────────────────────────────

describe("adr_create", () => {
  it("creates an ADR file in docs/decisions/", async () => {
    const result = await call("adr_create", {
      project_path: TMP,
      title: "Use SQLite",
      context: "We need persistent storage",
      decision: "Use better-sqlite3",
    });
    const { created } = json(result);
    expect(created).toBe("0001-use-sqlite.md");
    expect(existsSync(join(TMP, "docs", "decisions", created))).toBe(true);
  });

  it("ADR file contains context and decision", async () => {
    await call("adr_create", {
      project_path: TMP,
      title: "Use SQLite",
      context: "The context paragraph",
      decision: "The decision paragraph",
    });
    const content = readFileSync(join(TMP, "docs", "decisions", "0001-use-sqlite.md"), "utf-8");
    expect(content).toContain("The context paragraph");
    expect(content).toContain("The decision paragraph");
  });
});

// ─── memory_brain_sync ───────────────────────────────────────────────────────

describe("memory_brain_sync", () => {
  it("generates PROJECT_BRAIN.md and returns synced true", async () => {
    const result = await call("memory_brain_sync", { project_path: TMP });
    expect(json(result)).toMatchObject({ synced: true, totalMemories: expect.any(Number) });
    expect(existsSync(join(TMP, "docs", "PROJECT_BRAIN.md"))).toBe(true);
  });
});
