import { scanHooks, initHooks, getTransitionHook } from "@agent-kanban/core";
import type { HookName } from "@agent-kanban/core";

// ── Tool Definitions ──────────────────────────────────────────────

/** MCP tool definition for hooks_list. */
export const hooksListTool = {
  name: "hooks_list",
  description:
    "List available lifecycle hooks in .agents/hooks/. Hooks auto-fire on task transitions (on-task-start when moving to WIP, on-task-done when moving to DONE).",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
    },
  },
};

/** MCP tool definition for hooks_init. */
export const hooksInitTool = {
  name: "hooks_init",
  description:
    "Initialize .agents/hooks/ with default lifecycle hook templates (on-task-start, on-task-done, pre-commit). Skips files that already exist.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
    },
  },
};

// ── Handlers ──────────────────────────────────────────────────────

/** List available hooks. */
export async function handleHooksList(
  args: Record<string, unknown>,
): Promise<{ hooks: Awaited<ReturnType<typeof scanHooks>>; hint: string }> {
  const projectPath = (args.project_path as string) || process.cwd();
  const hooks = await scanHooks(projectPath);

  return {
    hooks,
    hint: hooks.length === 0
      ? "No hooks found. Run hooks_init to create default hook templates."
      : `Found ${hooks.length} hook(s). These auto-fire on task transitions.`,
  };
}

/** Initialize default hooks. */
export async function handleHooksInit(
  args: Record<string, unknown>,
): Promise<{ created: string[]; path: string }> {
  const projectPath = (args.project_path as string) || process.cwd();
  const created = await initHooks(projectPath);

  return {
    created,
    path: ".agents/hooks/",
  };
}

/**
 * Get hook content for a task transition.
 * Used internally by task_move to auto-include hook instructions.
 */
export async function getTransitionHookContent(
  projectPath: string,
  newStatus: string,
): Promise<string | null> {
  const hook = await getTransitionHook(projectPath, newStatus);
  return hook?.content ?? null;
}
