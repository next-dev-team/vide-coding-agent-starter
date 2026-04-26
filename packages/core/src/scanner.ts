import { readdir, readFile, rename } from "node:fs/promises";
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

// ─── Directory conventions ─────────────────────────────────────

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

// ─── List files ────────────────────────────────────────────────

/** List all markdown files in a directory, ignoring README. */
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

/** Scan docs/tasks/ and return all parsed tasks. */
export async function scanTasks(projectPath: string): Promise<Task[]> {
  const dir = docsDir(projectPath, "task");
  const files = await listMdFiles(dir);
  const tasks: Task[] = [];

  for (const file of files) {
    if (!parseTaskFilename(file)) continue;
    try {
      const content = await readFile(join(dir, file), "utf-8");
      tasks.push(parseTask(file, content));
    } catch {
      // skip unparseable files
    }
  }

  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

/** Build the full Kanban board from docs/tasks/. */
export async function scanBoard(projectPath: string): Promise<Board> {
  const tasks = await scanTasks(projectPath);

  const statusOrder: TaskStatus[] = ["todo", "wip", "done", "blocked"];
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

/** Find the next available sequential ID for a document type. */
export async function nextId(
  projectPath: string,
  docType: DocType,
): Promise<string> {
  const dir = docsDir(projectPath, docType);
  const files = await listMdFiles(dir);

  let maxNum = 0;
  for (const file of files) {
    // Extract leading digits from filenames (handles both task and prd/adr patterns)
    const cleaned = docType === "task"
      ? file.replace(/^(todo|wip|done|blocked)-/, "")
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

/** Move a task to a new status by renaming its file. Returns the new filename. */
export async function moveTask(
  projectPath: string,
  taskId: string,
  newStatus: TaskStatus,
): Promise<string> {
  const dir = docsDir(projectPath, "task");
  const files = await listMdFiles(dir);

  // Find the task file by ID
  const taskFile = files.find((f) => {
    const parsed = parseTaskFilename(f);
    return parsed && parsed.id === taskId;
  });

  if (!taskFile) {
    throw new Error(`Task ${taskId} not found in ${dir}`);
  }

  const parsed = parseTaskFilename(taskFile)!;
  if (parsed.status === newStatus) {
    return taskFile; // already in target status
  }

  const newFilename = `${newStatus}-${parsed.id}-${parsed.slug}.md`;
  await rename(join(dir, taskFile), join(dir, newFilename));
  return newFilename;
}
