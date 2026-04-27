import { scanTasks } from "@agent-kanban/core";

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for feature_loop. */
export const featureLoopTool = {
  name: "feature_loop",
  description:
    "Generate a structured feature-loop plan for a task. Returns a step-by-step orchestration sequence using existing MCP tools (worktree_create, pr_create, compound_learnings, review resources). The caller (IDE agent) executes each step.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      task_id: { type: "string", description: "Task ID to run the feature loop for, e.g. '0007'" },
      skip_worktree: {
        type: "boolean",
        description: "Skip worktree creation step. Defaults to false.",
      },
    },
    required: ["task_id"],
  },
};

/** Step in the feature loop plan. */
interface LoopStep {
  step: number;
  phase: "plan" | "worktree" | "implement" | "review" | "pr" | "compound" | "done";
  action: string;
  tool?: string;
  args?: Record<string, unknown>;
  manual?: boolean;
  description: string;
}

// ── Handler ───────────────────────────────────────────────────────

/** Generate a feature-loop orchestration plan for a task. */
export async function handleFeatureLoop(
  args: Record<string, unknown>,
): Promise<{ task_id: string; goal: string; steps: LoopStep[] }> {
  const projectPath = (args.project_path as string) || process.cwd();
  const taskId = args.task_id as string;
  const skipWorktree = args.skip_worktree === true;

  const tasks = await scanTasks(projectPath);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.status === "done") {
    throw new Error(`Task ${taskId} is already done. Nothing to loop.`);
  }

  const steps: LoopStep[] = [];
  let stepNum = 1;

  // Step 1: Read & Plan
  steps.push({
    step: stepNum++,
    phase: "plan",
    action: "Read the task file and plan the implementation approach.",
    tool: "task_read",
    args: { task_id: taskId },
    description: "Parse the task file to understand goal, acceptance criteria, and files affected.",
  });

  // Step 2: Move to WIP (if not already)
  if (task.status !== "wip") {
    steps.push({
      step: stepNum++,
      phase: "plan",
      action: "Move task to WIP status.",
      tool: "task_move",
      args: { task_id: taskId, new_status: "wip" },
      description: "Signal that work has started on this task.",
    });
  }

  // Step 3: Create worktree (optional)
  if (!skipWorktree) {
    steps.push({
      step: stepNum++,
      phase: "worktree",
      action: `Create git worktree at .worktrees/${taskId}/ on branch task/${taskId}.`,
      tool: "worktree_create",
      args: { task_id: taskId },
      description: "Isolate work in a dedicated worktree and branch.",
    });
  }

  // Step 4: Implement
  steps.push({
    step: stepNum++,
    phase: "implement",
    action: "Implement the task: write code, write tests, run build.",
    manual: true,
    description: `Implement the goal: "${task.goal}". Check acceptance criteria as you go. Run \`pnpm build\` and \`pnpm test\`.`,
  });

  // Step 5: Security Review
  steps.push({
    step: stepNum++,
    phase: "review",
    action: "Run security review checklist.",
    description: "Read the MCP resource kanban://review/security and review staged changes against it.",
  });

  // Step 6: Performance Review
  steps.push({
    step: stepNum++,
    phase: "review",
    action: "Run performance review checklist.",
    description: "Read the MCP resource kanban://review/performance and review staged changes against it.",
  });

  // Step 7: Create PR
  steps.push({
    step: stepNum++,
    phase: "pr",
    action: "Create a GitHub draft PR from the task.",
    tool: "pr_create",
    args: { task_id: taskId, draft: true },
    description: "Create a draft PR with the task title and acceptance criteria pre-filled.",
  });

  // Step 8: Move to Done
  steps.push({
    step: stepNum++,
    phase: "done",
    action: "Move task to done status.",
    tool: "task_move",
    args: { task_id: taskId, new_status: "done" },
    description: "Mark the task as completed.",
  });

  // Step 9: Compound Learnings
  steps.push({
    step: stepNum++,
    phase: "compound",
    action: "Extract reusable learnings from the completed task.",
    tool: "compound_learnings",
    args: { task_id: taskId },
    description: "Run the compound learnings extraction to persist knowledge for future tasks.",
  });

  return {
    task_id: taskId,
    goal: task.goal,
    steps,
  };
}
