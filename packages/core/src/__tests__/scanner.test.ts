import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { scanTasks, moveTask, resolveTaskDir } from "../scanner.js";

const TMP = join(import.meta.dirname, "__tmp_scanner__");

/** Create a minimal task markdown file. */
function taskMd(id: string, goal: string): string {
  return `# Task ${id}\n\n> PRD: (none)\n> Created: 2026-01-01\n\n## Goal\n\n${goal}\n\n## Acceptance Criteria\n\n- [ ] It works\n\n## Notes\n\n(empty)\n`;
}

beforeEach(async () => {
  await mkdir(join(TMP, "docs", "tasks", "done"), { recursive: true });
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
  });
});
