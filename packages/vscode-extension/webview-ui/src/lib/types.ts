/**
 * Wire types shared between the extension host and the webview.
 * Mirrors the shape from `@agent-kanban/core` but kept explicit here
 * so the webview bundle stays free of node-only deps.
 */

export type TaskStatus = "todo" | "wip" | "verified" | "done" | "blocked";

export interface AcceptanceItem {
  text: string;
  checked: boolean;
}

export interface Task {
  id: string;
  slug: string;
  filename: string;
  status: TaskStatus;
  goal?: string;
  acceptance: AcceptanceItem[];
}

export interface Column {
  status: TaskStatus;
  label: string;
  tasks: Task[];
}

export interface Board {
  totalTasks: number;
  columns: Column[];
}

/** Messages: webview → host */
export type OutboundMessage =
  | { type: "refresh" }
  | { type: "openFile"; filename: string }
  | { type: "moveTask"; taskId: string; newStatus: TaskStatus }
  | { type: "createTask" }
  | { type: "createPrd" }
  | { type: "compoundLearnings"; taskId: string }
  | { type: "worktreeCreate"; taskId: string }
  | { type: "worktreeCleanup"; taskId: string }
  | { type: "createPr"; taskId: string }
  | { type: "startFeatureLoop"; taskId: string }
  | { type: "openPrd"; filename: string }
  | { type: "openAdr"; filename: string }
  | { type: "openTestCase"; filename: string };

export interface DocEntry {
  filename: string;
  title: string;
  status?: string;
  summary?: string;
}

export interface DocsData {
  prds: DocEntry[];
  adrs: DocEntry[];
  tasks: DocEntry[];
  testCases?: DocEntry[];
}

export interface SkillInfo {
  slug: string;
  name: string;
  description: string;
  format: "local" | "cursor" | "copilot" | "claude" | "vercel";
  path: string;
  active: boolean;
}

/** Messages: host → webview */
export type InboundMessage =
  | { type: "boardUpdated"; board: Board; docs?: DocsData; skills?: SkillInfo[] }
  | { type: "docsUpdated"; docs: DocsData }
  | { type: "error"; message: string };
