import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanTasks } from "@agent-kanban/core";

const exec = promisify(execFile);

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for pr_create. */
export const prCreateTool = {
  name: "pr_create",
  description:
    "Create a GitHub Pull Request for a task using `gh pr create`. Reads the task file to pre-fill title and body. Defaults to draft mode.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      task_id: { type: "string", description: "Task ID, e.g. '0007'" },
      draft: {
        type: "boolean",
        description: "Create as draft PR. Defaults to true.",
      },
      base_branch: {
        type: "string",
        description: "Base branch for the PR. Defaults to 'main'.",
      },
    },
    required: ["task_id"],
  },
};

// ── Handler ───────────────────────────────────────────────────────

/** Create a GitHub PR pre-filled from the task file. */
export async function handlePrCreate(
  args: Record<string, unknown>,
): Promise<{ created: boolean; url?: string; title: string; draft: boolean }> {
  const projectPath = (args.project_path as string) || process.cwd();
  const taskId = args.task_id as string;
  const draft = args.draft !== false; // default true
  const baseBranch = (args.base_branch as string) || "main";

  // Find the task to get title and body
  const tasks = await scanTasks(projectPath);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const title = `Task ${task.id}: ${task.goal}`;
  const bodyLines = [
    `## Task ${task.id}`,
    "",
    `**Goal:** ${task.goal}`,
    "",
    "### Acceptance Criteria",
    "",
    ...task.acceptance.map(
      (a) => `- [${a.checked ? "x" : " "}] ${a.text}`,
    ),
  ];

  if (task.notes.length > 0) {
    bodyLines.push("", "### Notes", "", ...task.notes.map((n) => `- ${n}`));
  }

  const body = bodyLines.join("\n");

  // Build gh CLI args
  const ghArgs = [
    "pr",
    "create",
    "--title",
    title,
    "--body",
    body,
    "--base",
    baseBranch,
  ];

  if (draft) {
    ghArgs.push("--draft");
  }

  try {
    const { stdout } = await exec("gh", ghArgs, { cwd: projectPath });
    const url = stdout.trim();
    return { created: true, url, title, draft };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to create PR: ${message}. Make sure 'gh' CLI is installed and authenticated.`);
  }
}
