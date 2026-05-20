import type { Task } from "$lib/types";

/** Derive a display name from an absolute project root path. */
export function projectNameFromRoot(projectRoot?: string): string | undefined {
  if (!projectRoot) return undefined;
  const normalized = projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const segment = normalized.split("/").pop();
  return segment || undefined;
}

/**
 * Full kanban ticket reference for agent chat, e.g.
 * `kanban vide-coding-agent-starter : #0000`
 */
export function buildKanbanTaskRef(task: Task): string {
  const project = task.projectName ?? projectNameFromRoot(task.projectRoot);
  const id = task.id.startsWith("#") ? task.id : `#${task.id}`;
  if (project) return `kanban ${project} : ${id}`;
  return `kanban : ${id}`;
}
