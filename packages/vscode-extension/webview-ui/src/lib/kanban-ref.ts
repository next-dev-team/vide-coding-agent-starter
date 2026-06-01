import type { Task } from "$lib/types";
import {
  buildKanbanTaskRef as buildRef,
  buildKanbanTaskRefFull as buildRefFull,
  projectNameFromRoot,
  type BuildKanbanTaskRefOptions,
} from "@agent-kanban/core/kanban-ref";

export { projectNameFromRoot, type BuildKanbanTaskRefOptions };

/** Full kanban ticket reference for agent chat (includes project when known). */
export function buildKanbanTaskRef(
  task: Task,
  options?: BuildKanbanTaskRefOptions,
): string {
  return buildRef(task, options);
}

/** Richer reference: project, id, status, and goal for paste into agent chat. */
export function buildKanbanTaskRefFull(
  task: Task,
  options?: BuildKanbanTaskRefOptions,
): string {
  return buildRefFull(task, options);
}
