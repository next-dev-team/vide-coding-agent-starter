import { scanTasks, scanPrds } from "@agent-kanban/core";
import type { Task } from "@agent-kanban/core";

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

/** MCP tool definition for feature_loop_all. */
export const featureLoopAllTool = {
  name: "feature_loop_all",
  description:
    "Generate feature-loop plans for ALL pending (todo) tasks in the project. Returns a batch orchestration plan with per-task steps and a recommended execution order. Use this to process the entire backlog in one sweep.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      skip_worktree: {
        type: "boolean",
        description: "Skip worktree creation for all tasks. Defaults to false.",
      },
      include_wip: {
        type: "boolean",
        description: "Also include WIP tasks (resume in-progress work). Defaults to false.",
      },
      include_done: {
        type: "boolean",
        description: "Also include done tasks (for compound learnings extraction only). Defaults to false.",
      },
      prd_filter: {
        type: "string",
        description: "Only process tasks linked to this PRD ref (e.g. 'docs/prd/0004-team-runtime.md').",
      },
    },
  },
};

/** Step in the feature loop plan. */
interface LoopStep {
  step: number;
  phase: "interview" | "plan" | "hook" | "worktree" | "implement" | "drift" | "review" | "pr" | "compound" | "done" | "sync";
  action: string;
  tool?: string;
  args?: Record<string, unknown>;
  manual?: boolean;
  description: string;
}

/** Plan for a single task within a batch. */
interface TaskPlan {
  task_id: string;
  status: string;
  goal: string;
  prd_ref: string | null;
  steps: LoopStep[];
}

/** Summary of the batch execution plan. */
interface BatchPlan {
  mode: "batch";
  total_tasks: number;
  execution_order: string[];
  summary: string;
  prd_coverage: PrdCoverage[];
  tasks: TaskPlan[];
  post_batch_steps: LoopStep[];
}

/** PRD coverage in the batch. */
interface PrdCoverage {
  prd_id: string;
  title: string;
  status: string;
  task_count: number;
  task_ids: string[];
}

// ── Handler ───────────────────────────────────────────────────────

/** Generate a feature-loop orchestration plan for a single task. */
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

  const steps = buildTaskSteps(task, projectPath, skipWorktree, await scanPrds(projectPath));

  return {
    task_id: taskId,
    goal: task.goal,
    steps,
  };
}

/** Generate feature-loop plans for ALL pending tasks. */
export async function handleFeatureLoopAll(
  args: Record<string, unknown>,
): Promise<BatchPlan> {
  const projectPath = (args.project_path as string) || process.cwd();
  const skipWorktree = args.skip_worktree === true;
  const includeWip = args.include_wip === true;
  const includeDone = args.include_done === true;
  const prdFilter = args.prd_filter as string | undefined;

  const allTasks = await scanTasks(projectPath);
  const prds = await scanPrds(projectPath);

  // Filter tasks by status
  let targetTasks = allTasks.filter((t) => {
    if (t.status === "todo") return true;
    if (t.status === "wip" && includeWip) return true;
    if (t.status === "done" && includeDone) return true;
    return false;
  });

  // Filter by PRD if specified
  if (prdFilter) {
    targetTasks = targetTasks.filter((t) => t.prdRef?.includes(prdFilter));
  }

  if (targetTasks.length === 0) {
    throw new Error(
      "No pending tasks found. " +
      (prdFilter
        ? `No tasks matched PRD filter '${prdFilter}'.`
        : "All tasks are done or blocked. Create new tasks first."),
    );
  }

  // Sort: WIP first (resume), then TODO by ID
  targetTasks.sort((a, b) => {
    const statusOrder: Record<string, number> = { wip: 0, todo: 1, done: 2 };
    const aOrder = statusOrder[a.status] ?? 3;
    const bOrder = statusOrder[b.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id.localeCompare(b.id);
  });

  // Build per-task plans
  const taskPlans: TaskPlan[] = [];
  for (const task of targetTasks) {
    if (task.status === "done") {
      // For done tasks, only compound learnings
      taskPlans.push({
        task_id: task.id,
        status: task.status,
        goal: task.goal,
        prd_ref: task.prdRef ?? null,
        steps: buildCompoundOnlySteps(task),
      });
    } else {
      const steps = buildTaskSteps(task, projectPath, skipWorktree, prds);
      taskPlans.push({
        task_id: task.id,
        status: task.status,
        goal: task.goal,
        prd_ref: task.prdRef ?? null,
        steps,
      });
    }
  }

  // Build PRD coverage summary
  const prdCoverage: PrdCoverage[] = [];
  for (const prd of prds) {
    const linkedTasks = targetTasks.filter((t) =>
      t.prdRef?.includes(prd.filename),
    );
    if (linkedTasks.length > 0) {
      prdCoverage.push({
        prd_id: prd.id,
        title: prd.title,
        status: prd.status,
        task_count: linkedTasks.length,
        task_ids: linkedTasks.map((t) => t.id),
      });
    }
  }

  // Unlinked tasks (no PRD reference)
  const unlinkedTasks = targetTasks.filter((t) => !t.prdRef);
  if (unlinkedTasks.length > 0) {
    prdCoverage.push({
      prd_id: "(none)",
      title: "Tasks without PRD",
      status: "n/a",
      task_count: unlinkedTasks.length,
      task_ids: unlinkedTasks.map((t) => t.id),
    });
  }

  // Post-batch steps
  const postBatchSteps: LoopStep[] = [
    {
      step: 1,
      phase: "sync",
      action: "Sync all project documentation to reflect completed work.",
      tool: "docs_sync",
      args: { target_file: "docs/prd/" },
      description: "Update PRDs to mark shipped features and reconcile acceptance criteria.",
    },
    {
      step: 2,
      phase: "sync",
      action: "Regenerate PROJECT_BRAIN.md with new learnings.",
      tool: "memory_brain_sync",
      description: "Synthesize all memory engine L0 abstracts into a fresh project brain document.",
    },
    {
      step: 3,
      phase: "sync",
      action: "Regenerate AGENTS.md with current project state.",
      tool: "agents_generate",
      description: "Rebuild AGENTS.md to reflect new tools, conventions, and structure.",
    },
    {
      step: 4,
      phase: "review",
      action: "Run memory deduplication sweep.",
      tool: "memory_dedupe",
      args: { dry_run: true },
      description: "Scan for duplicate memories accumulated across multiple tasks. Review the report before applying.",
    },
  ];

  const executionOrder = targetTasks.map((t) => t.id);
  const wipCount = targetTasks.filter((t) => t.status === "wip").length;
  const todoCount = targetTasks.filter((t) => t.status === "todo").length;
  const doneCount = targetTasks.filter((t) => t.status === "done").length;

  const parts: string[] = [];
  if (wipCount > 0) parts.push(`${wipCount} WIP (resume)`);
  if (todoCount > 0) parts.push(`${todoCount} TODO`);
  if (doneCount > 0) parts.push(`${doneCount} DONE (compound only)`);

  return {
    mode: "batch",
    total_tasks: targetTasks.length,
    execution_order: executionOrder,
    summary: `Batch plan: ${parts.join(", ")}. Execute tasks sequentially in the listed order. Each task follows the full Plan → Implement → Review → Done → Compound lifecycle.`,
    prd_coverage: prdCoverage,
    tasks: taskPlans,
    post_batch_steps: postBatchSteps,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

/** Build feature-loop steps for a single task. */
function buildTaskSteps(
  task: Task,
  _projectPath: string,
  skipWorktree: boolean,
  prds: Array<{ id: string; title: string; filename: string }>,
): LoopStep[] {
  const steps: LoopStep[] = [];
  let stepNum = 1;

  // Step: Check if PRD exists — if not, run interview first
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
    args: { task_id: task.id },
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
      args: { task_id: task.id, new_status: "wip" },
      description: "Signal work has started. The response includes hook instructions — follow them.",
    });
  }

  // Step: Create worktree (optional)
  if (!skipWorktree) {
    steps.push({
      step: stepNum++,
      phase: "worktree",
      action: `Create git worktree at .worktrees/${task.id}/ on branch task/${task.id}.`,
      tool: "worktree_create",
      args: { task_id: task.id },
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
    args: { task_id: task.id },
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
    args: { task_id: task.id, draft: true },
    description: "Create a draft PR with the task title and acceptance criteria pre-filled.",
  });

  // Step: Move to Done (auto-triggers on-task-done hook + drift report)
  steps.push({
    step: stepNum++,
    phase: "done",
    action: "Move task to done — this auto-fires the on-task-done hook and drift report.",
    tool: "task_move",
    args: { task_id: task.id, new_status: "done" },
    description: "Mark the task as completed. The response includes a final drift report and done checklist — verify all items.",
  });

  // Step: Compound Learnings
  steps.push({
    step: stepNum++,
    phase: "compound",
    action: "Extract reusable learnings from the completed task.",
    tool: "compound_learnings",
    args: { task_id: task.id },
    description: "Run the compound learnings extraction to persist knowledge for future tasks.",
  });

  return steps;
}

/** Build compound-only steps for done tasks. */
function buildCompoundOnlySteps(task: Task): LoopStep[] {
  return [
    {
      step: 1,
      phase: "compound",
      action: "Extract reusable learnings from this completed task.",
      tool: "compound_learnings",
      args: { task_id: task.id },
      description: `Task already done. Extract learnings from: "${task.goal}".`,
    },
  ];
}
