import { checkDrift } from "@agent-kanban/core";

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for task_drift_check. */
export const driftCheckTool = {
  name: "task_drift_check",
  description:
    "Check if actual code changes align with the task's planned scope. Compares 'Files Likely Affected' from the task spec against git diff output. Returns unexpected files (scope creep) and missing files (incomplete work). Auto-runs on task_move to 'done'.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      task_id: { type: "string", description: "Task ID to check drift for, e.g. '0007'" },
    },
    required: ["task_id"],
  },
};

// ── Handler ───────────────────────────────────────────────────────

/** Check drift between task plan and actual changes. */
export async function handleDriftCheck(
  args: Record<string, unknown>,
): Promise<ReturnType<typeof checkDrift>> {
  const projectPath = (args.project_path as string) || process.cwd();
  const taskId = args.task_id as string;

  return checkDrift(projectPath, taskId);
}
