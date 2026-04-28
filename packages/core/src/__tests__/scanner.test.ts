import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { scanTasks, scanBoard, scanPrds, moveTask, resolveTaskDir, nextId } from "../scanner.js";
import { writeTask, writePrd } from "../writer.js";

const TMP = join(import.meta.dirname, "__tmp_scanner__");

/** Create a minimal task markdown file. */
function taskMd(id: string, goal: string): string {
  return `# Task ${id}\n\n> PRD: (none)\n> Created: 2026-01-01\n\n## Goal\n\n${goal}\n\n## Acceptance Criteria\n\n- [ ] It works\n\n## Notes\n\n(empty)\n`;
}

beforeEach(async () => {
  await mkdir(join(TMP, "docs", "tasks", "done"), { recursive: true });
  await mkdir(join(TMP, "docs", "prd"), { recursive: true });
  await mkdir(join(TMP, "docs", "decisions"), { recursive: true });
});

afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe("scanner", () => {
  describe("resolveTaskDir", () => {
    it("returns docs/tasks/ for non-done statuses", () => {
      expect(resolveTaskDir(TMP, "todo")).toBe(join(TMP, "docs", "tasks"));
      expect(resolveTaskDir(TMP, "wip")).toBe(join(TMP, "docs", "tasks"));
      expect(resolveTaskDir(TMP, "blocked")).toBe(join(TMP, "docs", "tasks"));
    });

    it("returns docs/tasks/done/ for done status", () => {
      expect(resolveTaskDir(TMP, "done")).toBe(join(TMP, "docs", "tasks", "done"));
    });
  });

  describe("scanTasks — auto-migration", () => {
    it("auto-migrates stray done- files from root to done/ subfolder", async () => {
      const tasksDir = join(TMP, "docs", "tasks");
      const doneDir = join(tasksDir, "done");

      // Place a stray done- file in the root tasks directory
      await writeFile(join(tasksDir, "done-0099-stray-task.md"), taskMd("0099", "stray"));

      // Scan should auto-migrate it
      const tasks = await scanTasks(TMP);

      // File should now be in done/ subfolder
      expect(existsSync(join(doneDir, "done-0099-stray-task.md"))).toBe(true);
      // File should NOT be in root anymore
      expect(existsSync(join(tasksDir, "done-0099-stray-task.md"))).toBe(false);
      // Task should still appear in scan results
      expect(tasks.find((t) => t.id === "0099")).toBeTruthy();
    });

    it("leaves active tasks in root docs/tasks/", async () => {
      const tasksDir = join(TMP, "docs", "tasks");
      await writeFile(join(tasksDir, "todo-0001-active.md"), taskMd("0001", "active"));

      const tasks = await scanTasks(TMP);

      expect(existsSync(join(tasksDir, "todo-0001-active.md"))).toBe(true);
      expect(tasks.find((t) => t.id === "0001")?.status).toBe("todo");
    });
  });

  describe("moveTask — done routing", () => {
    it("moves task to done/ subfolder when status is done", async () => {
      const tasksDir = join(TMP, "docs", "tasks");
      const doneDir = join(tasksDir, "done");
      await writeFile(join(tasksDir, "wip-0042-feature.md"), taskMd("0042", "feature"));

      const newFilename = await moveTask(TMP, "0042", "done");

      expect(newFilename).toBe("done-0042-feature.md");
      expect(existsSync(join(doneDir, "done-0042-feature.md"))).toBe(true);
      expect(existsSync(join(tasksDir, "wip-0042-feature.md"))).toBe(false);
    });

    it("moves task back from done/ to root when reopening", async () => {
      const tasksDir = join(TMP, "docs", "tasks");
      const doneDir = join(tasksDir, "done");
      await writeFile(join(doneDir, "done-0050-closed.md"), taskMd("0050", "closed"));

      const newFilename = await moveTask(TMP, "0050", "wip");

      expect(newFilename).toBe("wip-0050-closed.md");
      expect(existsSync(join(tasksDir, "wip-0050-closed.md"))).toBe(true);
      expect(existsSync(join(doneDir, "done-0050-closed.md"))).toBe(false);
    });

    it("returns same filename when task is already in target status", async () => {
      const tasksDir = join(TMP, "docs", "tasks");
      await writeFile(join(tasksDir, "todo-0099-noop.md"), taskMd("0099", "noop"));
      const result = await moveTask(TMP, "0099", "todo");
      expect(result).toBe("todo-0099-noop.md");
    });

    it("throws when task id does not exist", async () => {
      await expect(moveTask(TMP, "9999", "done")).rejects.toThrow("Task 9999 not found");
    });

    it("can move through all statuses", async () => {
      const tasksDir = join(TMP, "docs", "tasks");
      const doneDir = join(tasksDir, "done");
      await writeFile(join(tasksDir, "todo-0010-journey.md"), taskMd("0010", "journey"));

      await moveTask(TMP, "0010", "wip");
      expect(existsSync(join(tasksDir, "wip-0010-journey.md"))).toBe(true);

      await moveTask(TMP, "0010", "blocked");
      expect(existsSync(join(tasksDir, "blocked-0010-journey.md"))).toBe(true);

      await moveTask(TMP, "0010", "done");
      expect(existsSync(join(doneDir, "done-0010-journey.md"))).toBe(true);
    });
  });
});

// ─── nextId ──────────────────────────────────────────────────────────────────

describe("nextId", () => {
  it("returns 0001 for empty task directory", async () => {
    const id = await nextId(TMP, "task");
    expect(id).toBe("0001");
  });

  it("returns next after highest active task id", async () => {
    const tasksDir = join(TMP, "docs", "tasks");
    await writeFile(join(tasksDir, "todo-0003-task.md"), taskMd("0003", "task"));
    await writeFile(join(tasksDir, "wip-0007-other.md"), taskMd("0007", "other"));
    const id = await nextId(TMP, "task");
    expect(id).toBe("0008");
  });

  it("accounts for done tasks to avoid id collisions", async () => {
    const tasksDir = join(TMP, "docs", "tasks");
    const doneDir = join(tasksDir, "done");
    await writeFile(join(tasksDir, "todo-0001-active.md"), taskMd("0001", "active"));
    await writeFile(join(doneDir, "done-0015-archived.md"), taskMd("0015", "archived"));
    const id = await nextId(TMP, "task");
    expect(id).toBe("0016");
  });

  it("returns 0001 for empty prd directory", async () => {
    const id = await nextId(TMP, "prd");
    expect(id).toBe("0001");
  });

  it("returns next after highest prd id", async () => {
    const prdDir = join(TMP, "docs", "prd");
    const md = writePrd({ id: "0005", title: "T", problem: "P" });
    await writeFile(join(prdDir, "0005-feature.md"), md);
    const id = await nextId(TMP, "prd");
    expect(id).toBe("0006");
  });
});

// ─── scanBoard ───────────────────────────────────────────────────────────────

describe("scanBoard", () => {
  it("returns board with four columns in order", async () => {
    const board = await scanBoard(TMP);
    expect(board.columns).toHaveLength(5);
    expect(board.columns.map((c) => c.status)).toEqual(["todo", "wip", "verified", "done", "blocked"]);
  });

  it("returns empty board when no tasks exist", async () => {
    const board = await scanBoard(TMP);
    expect(board.totalTasks).toBe(0);
    for (const col of board.columns) expect(col.tasks).toHaveLength(0);
  });

  it("places tasks in correct columns", async () => {
    const tasksDir = join(TMP, "docs", "tasks");
    const doneDir = join(tasksDir, "done");
    await writeFile(join(tasksDir, "todo-0001-a.md"), taskMd("0001", "a"));
    await writeFile(join(tasksDir, "wip-0002-b.md"), taskMd("0002", "b"));
    await writeFile(join(doneDir, "done-0003-c.md"), taskMd("0003", "c"));
    await writeFile(join(tasksDir, "blocked-0004-d.md"), taskMd("0004", "d"));

    const board = await scanBoard(TMP);
    expect(board.totalTasks).toBe(4);
    expect(board.columns.find((c) => c.status === "todo")?.tasks).toHaveLength(1);
    expect(board.columns.find((c) => c.status === "wip")?.tasks).toHaveLength(1);
    expect(board.columns.find((c) => c.status === "done")?.tasks).toHaveLength(1);
    expect(board.columns.find((c) => c.status === "blocked")?.tasks).toHaveLength(1);
  });

  it("returns projectPath in board object", async () => {
    const board = await scanBoard(TMP);
    expect(board.projectPath).toBe(TMP);
  });
});

// ─── scanPrds ────────────────────────────────────────────────────────────────

describe("scanPrds", () => {
  it("returns empty array when docs/prd/ is empty", async () => {
    const prds = await scanPrds(TMP);
    expect(prds).toHaveLength(0);
  });

  it("parses and returns PRDs sorted by id", async () => {
    const prdDir = join(TMP, "docs", "prd");
    await writeFile(join(prdDir, "0002-feature-b.md"), writePrd({ id: "0002", title: "Feature B", problem: "P" }));
    await writeFile(join(prdDir, "0001-feature-a.md"), writePrd({ id: "0001", title: "Feature A", problem: "P" }));

    const prds = await scanPrds(TMP);
    expect(prds).toHaveLength(2);
    expect(prds[0].id).toBe("0001");
    expect(prds[1].id).toBe("0002");
  });

  it("skips README.md files", async () => {
    const prdDir = join(TMP, "docs", "prd");
    await writeFile(join(prdDir, "README.md"), "# Docs");
    await writeFile(join(prdDir, "0001-feature.md"), writePrd({ id: "0001", title: "T", problem: "P" }));

    const prds = await scanPrds(TMP);
    expect(prds).toHaveLength(1);
  });
});
