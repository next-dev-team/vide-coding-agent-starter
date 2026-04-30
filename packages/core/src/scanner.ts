import { readdir, readFile, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseTask, parseTaskFilename, parsePrd, parseAdr } from "./parser.js";
import type {
  Board,
  BoardColumn,
  Task,
  TaskStatus,
  Prd,
  Adr,
  DocType,
} from "./types.js";

// ─── Directory helpers ─────────────────────────────────────────

/** Resolve the docs subdirectory for a document type. */
function docsDir(projectPath: string, docType: DocType): string {
  switch (docType) {
    case "task":
      return join(projectPath, "docs", "tasks");
    case "prd":
      return join(projectPath, "docs", "prd");
    case "adr":
      return join(projectPath, "docs", "decisions");
  }
}

/**
 * The subdirectory where completed (done) task files are stored.
 * Keeps the active board clean while preserving history in git.
 */
function doneDir(projectPath: string): string {
  return join(projectPath, "docs", "tasks", "done");
}

/**
 * Resolve the correct directory for a task based on its status.
 * Done tasks live in docs/tasks/done/, all others in docs/tasks/.
 */
export function resolveTaskDir(projectPath: string, status: TaskStatus): string {
  return status === "done"
    ? doneDir(projectPath)
    : docsDir(projectPath, "task");
}

// ─── List files ────────────────────────────────────────────────

/** List all markdown files in a directory, ignoring README and subdirectories. */
async function listMdFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    return entries.filter(
      (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md",
    );
  } catch {
    return [];
  }
}

// ─── Task Scanner ──────────────────────────────────────────────

/**
 * Scan docs/tasks/ (active: todo/wip/blocked) and docs/tasks/done/ (archived)
 * and return all parsed tasks combined and sorted by ID.
 */
export async function scanTasks(projectPath: string): Promise<Task[]> {
  const activeDir = docsDir(projectPath, "task");
  const finishedDir = doneDir(projectPath);
  const tasks: Task[] = [];

  // Active tasks (todo / wip / blocked)
  // Auto-migrate any stray done- files in root to done/ subfolder.
  const activeFiles = await listMdFiles(activeDir);
  for (const file of activeFiles) {
    const parsed = parseTaskFilename(file);
    if (!parsed) continue;
    if (parsed.status === "done") {
      // Auto-migrate stray done- files to the done/ subfolder
      try {
        await mkdir(finishedDir, { recursive: true });
        await rename(join(activeDir, file), join(finishedDir, file));
      } catch {
        // If rename fails (e.g. file already exists), skip quietly
      }
      continue;
    }
    try {
      const content = await readFile(join(activeDir, file), "utf-8");
      tasks.push(parseTask(file, content));
    } catch {
      // skip unparseable files
    }
  }

  // Done tasks — always read from docs/tasks/done/
  const doneFiles = await listMdFiles(finishedDir);
  for (const file of doneFiles) {
    const parsed = parseTaskFilename(file);
    if (!parsed) continue;
    try {
      const content = await readFile(join(finishedDir, file), "utf-8");
      tasks.push(parseTask(file, content));
    } catch {
      // skip unparseable files
    }
  }

  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

/** Build the full Kanban board from docs/tasks/ and docs/tasks/done/. */
export async function scanBoard(projectPath: string): Promise<Board> {
  const tasks = await scanTasks(projectPath);

  const statusOrder: TaskStatus[] = ["todo", "wip", "verified", "done", "achieved", "blocked"];
  const columns: BoardColumn[] = statusOrder.map((status) => ({
    status,
    label: status.toUpperCase(),
    tasks: tasks.filter((t) => t.status === status),
  }));

  return {
    columns,
    totalTasks: tasks.length,
    projectPath,
  };
}

// ─── PRD Scanner ───────────────────────────────────────────────

/** Scan docs/prd/ and return all parsed PRDs. */
export async function scanPrds(projectPath: string): Promise<Prd[]> {
  const dir = docsDir(projectPath, "prd");
  const files = await listMdFiles(dir);
  const prds: Prd[] = [];

  for (const file of files) {
    try {
      const content = await readFile(join(dir, file), "utf-8");
      prds.push(parsePrd(file, content));
    } catch {
      // skip unparseable files
    }
  }

  return prds.sort((a, b) => a.id.localeCompare(b.id));
}

// ─── ADR Scanner ───────────────────────────────────────────────

/** Scan docs/decisions/ and return all parsed ADRs. */
export async function scanAdrs(projectPath: string): Promise<Adr[]> {
  const dir = docsDir(projectPath, "adr");
  const files = await listMdFiles(dir);
  const adrs: Adr[] = [];

  for (const file of files) {
    try {
      const content = await readFile(join(dir, file), "utf-8");
      adrs.push(parseAdr(file, content));
    } catch {
      // skip unparseable files
    }
  }

  return adrs.sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Next ID ───────────────────────────────────────────────────

/**
 * Find the next available sequential ID for a document type.
 * For tasks, scans both docs/tasks/ and docs/tasks/done/ to keep IDs globally unique.
 */
export async function nextId(
  projectPath: string,
  docType: DocType,
): Promise<string> {
  const dir = docsDir(projectPath, docType);
  const files = await listMdFiles(dir);

  // Include done/ for tasks so new IDs never collide with archived ones
  const doneFiles =
    docType === "task" ? await listMdFiles(doneDir(projectPath)) : [];
  const allFiles = [...files, ...doneFiles];

  let maxNum = 0;
  for (const file of allFiles) {
    const cleaned =
      docType === "task"
        ? file.replace(/^(todo|wip|verified|done|blocked|achieved)-/, "")
        : file;
    const numMatch = cleaned.match(/^(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return String(maxNum + 1).padStart(4, "0");
}

// ─── Task Mover ────────────────────────────────────────────────

/**
 * Move a task to a new status by renaming its file.
 *
 * Routing rules:
 * - `done`          → docs/tasks/done/<filename>
 * - any other status → docs/tasks/<filename>
 *
 * Searches both directories to find the current file, so tasks can be
 * moved back out of done (e.g. done → wip for re-opening).
 *
 * Returns the new filename (without directory).
 */
export async function moveTask(
  projectPath: string,
  taskId: string,
  newStatus: TaskStatus,
): Promise<string> {
  const activeDir = docsDir(projectPath, "task");
  const finishedDir = doneDir(projectPath);

  // Search active dir first, then done/
  const activeFiles = await listMdFiles(activeDir);
  const doneFiles = await listMdFiles(finishedDir);

  let taskFile: string | undefined;
  let sourceDir: string = activeDir;

  const inActive = activeFiles.find((f) => {
    const p = parseTaskFilename(f);
    return p && p.id === taskId;
  });

  if (inActive) {
    taskFile = inActive;
    sourceDir = activeDir;
  } else {
    const inDone = doneFiles.find((f) => {
      const p = parseTaskFilename(f);
      return p && p.id === taskId;
    });
    if (inDone) {
      taskFile = inDone;
      sourceDir = finishedDir;
    }
  }

  if (!taskFile) {
    throw new Error(`Task ${taskId} not found`);
  }

  const parsed = parseTaskFilename(taskFile)!;
  if (parsed.status === newStatus) {
    return taskFile; // already in target status
  }

  const newFilename = `${newStatus}-${parsed.id}-${parsed.slug}.md`;
  const destDir = newStatus === "done" ? finishedDir : activeDir;

  if (newStatus === "done") {
    await mkdir(finishedDir, { recursive: true });
  }

  await rename(join(sourceDir, taskFile), join(destDir, newFilename));
  return newFilename;
}
