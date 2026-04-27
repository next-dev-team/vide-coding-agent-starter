import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

const exec = promisify(execFile);

/** Run a git command in the given cwd. */
async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await exec("git", args, { cwd });
  return stdout.trim();
}

// ── Tool Definitions ──────────────────────────────────────────────

/** MCP tool definition for worktree_create. */
export const worktreeCreateTool = {
  name: "worktree_create",
  description:
    "Create a git worktree for a task. Creates a branch named `task/<task-id>` at `.worktrees/<task-id>/`. Useful when a task moves from todo → wip.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      task_id: { type: "string", description: "Task ID, e.g. '0007'" },
      branch_name: {
        type: "string",
        description: "Custom branch name. Defaults to task/<task-id>.",
      },
    },
    required: ["task_id"],
  },
};

/** MCP tool definition for worktree_cleanup. */
export const worktreeCleanupTool = {
  name: "worktree_cleanup",
  description:
    "Remove a git worktree for a task. Deletes the `.worktrees/<task-id>/` directory and prunes the worktree reference.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      task_id: { type: "string", description: "Task ID, e.g. '0007'" },
    },
    required: ["task_id"],
  },
};

// ── Handlers ──────────────────────────────────────────────────────

/** Create a git worktree for a task. */
export async function handleWorktreeCreate(
  args: Record<string, unknown>,
): Promise<{ created: boolean; worktreePath: string; branch: string }> {
  const projectPath = (args.project_path as string) || process.cwd();
  const taskId = args.task_id as string;
  const branch = (args.branch_name as string) || `task/${taskId}`;
  const worktreePath = join(projectPath, ".worktrees", taskId);

  if (existsSync(worktreePath)) {
    return { created: false, worktreePath, branch };
  }

  // Check if branch already exists
  let branchExists = false;
  try {
    await git(["rev-parse", "--verify", branch], projectPath);
    branchExists = true;
  } catch {
    // branch does not exist
  }

  if (branchExists) {
    await git(["worktree", "add", worktreePath, branch], projectPath);
  } else {
    await git(["worktree", "add", worktreePath, "-b", branch], projectPath);
  }

  return { created: true, worktreePath, branch };
}

/** Remove a git worktree for a task. */
export async function handleWorktreeCleanup(
  args: Record<string, unknown>,
): Promise<{ removed: boolean; worktreePath: string }> {
  const projectPath = (args.project_path as string) || process.cwd();
  const taskId = args.task_id as string;
  const worktreePath = join(projectPath, ".worktrees", taskId);

  if (!existsSync(worktreePath)) {
    return { removed: false, worktreePath };
  }

  // Remove the worktree directory
  await rm(worktreePath, { recursive: true, force: true });
  // Prune stale worktree references
  await git(["worktree", "prune"], projectPath);

  return { removed: true, worktreePath };
}
