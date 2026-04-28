import { scanTasks, scanPrds } from "@agent-kanban/core";

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for feature_loop. */
export const featureLoopTool = {
  name: "feature_loop",
  description:
    "Generate a structured feature-loop plan for a task. Returns a step-by-step orchestration sequence using existing MCP tools (worktree_create, pr_create, compound_learnings, review resources). Auto-includes lifecycle hooks, drift detection, and interview steps. The caller (IDE agent) executes each step.",
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
  phase: "interview" | "plan" | "hook" | "worktree" | "implement" | "drift" | "review" | "pr" | "compound" | "done";
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

  // Step: Check if PRD exists — if not, run interview first
  const prds = await scanPrds(projectPath);
  const hasPrd = task.prdRef || prds.length > 0;
  if (!hasPrd) {
    steps.push({
      step: stepNum++,
      phase: "interview",
      action: "No PRD found — run intent interview to clarify scope before coding.",
      tool: "intent_interview",
      args: { description: task.goal },
      description: "Clarify intent, edge cases, and constraints. Use answers to create a PRD before proceeding.",
    });
  }

  // Step: Read & Plan
  steps.push({
    step: stepNum++,
    phase: "plan",
    action: "Read the task file and plan the implementation approach.",
    tool: "task_read",
    args: { task_id: taskId },
    description: "Parse the task file to understand goal, acceptance criteria, and files affected.",
  });

  // Step: Check memory for related past work
  steps.push({
    step: stepNum++,
    phase: "plan",
    action: "Search memory for related patterns and past work.",
    tool: "memory_find",
    args: { query: task.goal },
    description: "Check if similar work was done before — reuse patterns, avoid known pitfalls.",
  });

  // Step: Move to WIP (auto-triggers on-task-start hook)
  if (task.status !== "wip") {
    steps.push({
      step: stepNum++,
      phase: "hook",
      action: "Move task to WIP — this auto-fires the on-task-start lifecycle hook.",
      tool: "task_move",
      args: { task_id: taskId, new_status: "wip" },
      description: "Signal work has started. The response includes hook instructions — follow them.",
    });
  }

  // Step: Create worktree (optional)
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

  // Step: Implement
  steps.push({
    step: stepNum++,
    phase: "implement",
    action: "Implement the task: write code, write tests, run build.",
    manual: true,
    description: `Implement the goal: "${task.goal}". Check acceptance criteria as you go. Run \`pnpm build\` and \`pnpm test\`.`,
  });

  // Step: Drift check before review
  steps.push({
    step: stepNum++,
    phase: "drift",
    action: "Run drift check — verify changes match the planned scope.",
    tool: "task_drift_check",
    args: { task_id: taskId },
    description: "Compare actual git diff against expected file scope from the task. Fix any unexpected changes before proceeding.",
  });

  // Step: Security Review
  steps.push({
    step: stepNum++,
    phase: "review",
    action: "Run security review checklist.",
    description: "Read the MCP resource kanban://review/security and review staged changes against it.",
  });

  // Step: Performance Review
  steps.push({
    step: stepNum++,
    phase: "review",
    action: "Run performance review checklist.",
    description: "Read the MCP resource kanban://review/performance and review staged changes against it.",
  });

  // Step: Create PR
  steps.push({
    step: stepNum++,
    phase: "pr",
    action: "Create a GitHub draft PR from the task.",
    tool: "pr_create",
    args: { task_id: taskId, draft: true },
    description: "Create a draft PR with the task title and acceptance criteria pre-filled.",
  });

  // Step: Move to Done (auto-triggers on-task-done hook + drift report)
  steps.push({
    step: stepNum++,
    phase: "done",
    action: "Move task to done — this auto-fires the on-task-done hook and drift report.",
    tool: "task_move",
    args: { task_id: taskId, new_status: "done" },
    description: "Mark the task as completed. The response includes a final drift report and done checklist — verify all items.",
  });

  // Step: Compound Learnings
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
