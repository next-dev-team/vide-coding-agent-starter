// ─── Task Status ───────────────────────────────────────────────

/** The four valid task statuses, encoded as filename prefixes. */
export type TaskStatus = "todo" | "wip" | "done" | "blocked";

/** All valid status prefixes in order. */
export const TASK_STATUSES: readonly TaskStatus[] = [
  "todo",
  "wip",
  "done",
  "blocked",
] as const;

// ─── Acceptance Criterion ──────────────────────────────────────

/** A single checkbox line from the Acceptance Criteria section. */
export interface AcceptanceCriterion {
  /** Whether the checkbox is checked. */
  checked: boolean;
  /** The text content of the criterion. */
  text: string;
}

// ─── Task ──────────────────────────────────────────────────────

/** A parsed task from `docs/tasks/{status}-{id}-{slug}.md`. */
export interface Task {
  /** The numeric part of the ID, e.g. "0001" or "0001a". */
  id: string;
  /** The kebab-case slug, e.g. "add-todo-input". */
  slug: string;
  /** Current status derived from the filename prefix. */
  status: TaskStatus;
  /** The filename (without directory), e.g. "todo-0001-add-todo-input.md". */
  filename: string;
  /** One-sentence goal from the Goal section. */
  goal: string;
  /** PRD reference string, e.g. "docs/prd/0001-add-todo.md". */
  prdRef: string | null;
  /** Creation date string, e.g. "2026-04-26". */
  created: string | null;
  /** Parsed acceptance criteria with checkbox states. */
  acceptance: AcceptanceCriterion[];
  /** File paths listed in the Files Likely Affected section. */
  filesAffected: string[];
  /** Approach bullets. */
  approach: string[];
  /** Open questions. */
  openQuestions: string[];
  /** Implementation notes. */
  notes: string[];
  /** Full raw markdown content. */
  raw: string;
}

// ─── PRD ───────────────────────────────────────────────────────

/** PRD status values. */
export type PrdStatus = "draft" | "approved" | "shipped";

/** A parsed PRD from `docs/prd/{id}-{slug}.md`. */
export interface Prd {
  /** The numeric ID, e.g. "0001". */
  id: string;
  /** The slug, e.g. "add-todo". */
  slug: string;
  /** Status from the header blockquote. */
  status: PrdStatus | string;
  /** Owner from the header blockquote. */
  owner: string | null;
  /** Creation date. */
  created: string | null;
  /** The filename. */
  filename: string;
  /** The PRD title (from # heading). */
  title: string;
  /** Problem statement. */
  problem: string;
  /** Acceptance criteria. */
  acceptance: AcceptanceCriterion[];
  /** Full raw markdown. */
  raw: string;
}

// ─── ADR ───────────────────────────────────────────────────────

/** ADR status values. */
export type AdrStatus = "proposed" | "accepted" | "deprecated" | string;

/** A parsed ADR from `docs/decisions/{id}-{slug}.md`. */
export interface Adr {
  /** The numeric ID, e.g. "0001". */
  id: string;
  /** The slug. */
  slug: string;
  /** Status. */
  status: AdrStatus;
  /** Decision date. */
  date: string | null;
  /** The filename. */
  filename: string;
  /** The ADR title. */
  title: string;
  /** Context section content. */
  context: string;
  /** Decision section content. */
  decision: string;
  /** Full raw markdown. */
  raw: string;
}

// ─── Board ─────────────────────────────────────────────────────

/** A column on the Kanban board. */
export interface BoardColumn {
  /** Column status. */
  status: TaskStatus;
  /** Display label, e.g. "TODO", "WIP". */
  label: string;
  /** Tasks in this column, sorted by ID. */
  tasks: Task[];
}

/** The full Kanban board state. */
export interface Board {
  /** Board columns in display order. */
  columns: BoardColumn[];
  /** Total task count. */
  totalTasks: number;
  /** Project root path. */
  projectPath: string;
}

// ─── Template ──────────────────────────────────────────────────

/** Metadata from a template.json file. */
export interface TemplateInfo {
  /** Template directory name, e.g. "todo-vite-react". */
  dirName: string;
  /** Human-readable name. */
  name: string;
  /** Short description. */
  description: string;
  /** Tech stack info. */
  stack: Record<string, string>;
  /** Command to run after scaffold, e.g. "npm install". */
  postInstall?: string;
  /** Path to the first task to try. */
  firstTask?: string;
}

// ─── Document Type ─────────────────────────────────────────────

/** The three document types managed by the workflow. */
export type DocType = "prd" | "task" | "adr";
