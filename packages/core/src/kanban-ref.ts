/** Minimal task fields needed to build a kanban chat reference. */
export interface KanbanTaskRefInput {
  id: string;
  projectName?: string;
  projectRoot?: string;
  status?: string;
  goal?: string;
  slug?: string;
}

export interface BuildKanbanTaskRefOptions {
  /** Used when the task has no projectName or projectRoot (e.g. demo board). */
  fallbackProjectName?: string;
}

/** Derive a display name from an absolute project root path. */
export function projectNameFromRoot(projectRoot?: string): string | undefined {
  if (!projectRoot) return undefined;
  const normalized = projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const segment = normalized.split("/").pop();
  return segment || undefined;
}

function resolveProjectName(
  input: KanbanTaskRefInput,
  options?: BuildKanbanTaskRefOptions,
): string | undefined {
  return (
    input.projectName ??
    projectNameFromRoot(input.projectRoot) ??
    options?.fallbackProjectName
  );
}

function formatTaskId(id: string): string {
  return id.startsWith("#") ? id : `#${id}`;
}

/**
 * Full kanban ticket reference for agent chat, e.g.
 * `kanban vide-coding-agent-starter : #0000`
 */
export function buildKanbanTaskRef(
  input: KanbanTaskRefInput,
  options?: BuildKanbanTaskRefOptions,
): string {
  const project = resolveProjectName(input, options);
  const taskId = formatTaskId(input.id);
  if (project) return `kanban ${project} : ${taskId}`;
  return `kanban : ${taskId}`;
}

/**
 * Richer reference for paste into chat: project, id, status, and goal/slug.
 * e.g. `kanban my-app : #0001 (wip) Port the Kanban tab`
 */
export function buildKanbanTaskRefFull(
  input: KanbanTaskRefInput,
  options?: BuildKanbanTaskRefOptions,
): string {
  const base = buildKanbanTaskRef(input, options);
  const parts: string[] = [];
  if (input.status) parts.push(`(${input.status})`);
  const title = input.goal?.trim() || input.slug?.replace(/-/g, " ").trim();
  if (title) parts.push(title);
  if (parts.length === 0) return base;
  return `${base} ${parts.join(" ")}`;
}
