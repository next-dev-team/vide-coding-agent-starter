import { scanTasks, scanPrds, scanAdrs, scanBoard, checkDrift, createMemoryBackend } from "@agent-kanban/core";
import type { Task, Prd } from "@agent-kanban/core";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for project_sync_all. */
export const projectSyncAllTool = {
  name: "project_sync_all",
  description:
    "Full project synchronization scan with review. Compares PRDs, tasks, code, docs, and memory for drift, staleness, and inconsistencies. Returns a comprehensive sync report with actionable steps. Does NOT modify files — it's a read-only audit that the agent acts on.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      include_review: {
        type: "boolean",
        description: "Include security and performance review checklists in the report. Defaults to true.",
      },
      include_git: {
        type: "boolean",
        description: "Include git status analysis (uncommitted changes, branch info). Defaults to true.",
      },
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────

/** Health status for a document or component. */
type HealthStatus = "ok" | "warning" | "error" | "stale";

/** An individual finding from the sync scan. */
interface SyncFinding {
  category: "prd" | "task" | "code" | "docs" | "memory" | "git" | "review";
  severity: "info" | "warning" | "action_required";
  title: string;
  detail: string;
  suggested_tool?: string;
  suggested_args?: Record<string, unknown>;
}

/** PRD sync status. */
interface PrdSyncStatus {
  id: string;
  title: string;
  status: string;
  health: HealthStatus;
  task_count: number;
  tasks_todo: number;
  tasks_wip: number;
  tasks_done: number;
  issues: string[];
}

/** Task sync status. */
interface TaskSyncStatus {
  id: string;
  goal: string;
  status: string;
  health: HealthStatus;
  has_prd: boolean;
  acceptance_total: number;
  acceptance_done: number;
  drift_status?: "clean" | "drifted" | "unknown";
  issues: string[];
}

/** Git status. */
interface GitStatus {
  branch: string;
  uncommitted_files: number;
  untracked_files: number;
  ahead: number;
  behind: number;
  stale_worktrees: string[];
}

/** Memory status. */
interface MemoryStatus {
  total_memories: number;
  categories: Record<string, number>;
  brain_exists: boolean;
  brain_stale: boolean;
}

/** Full sync report. */
interface SyncReport {
  timestamp: string;
  project_path: string;
  summary: string;
  health: HealthStatus;
  stats: {
    total_prds: number;
    total_tasks: number;
    total_adrs: number;
    tasks_todo: number;
    tasks_wip: number;
    tasks_done: number;
    tasks_blocked: number;
    findings_count: number;
    action_required_count: number;
  };
  prds: PrdSyncStatus[];
  tasks: TaskSyncStatus[];
  git?: GitStatus;
  memory: MemoryStatus;
  findings: SyncFinding[];
  recommended_actions: SyncAction[];
}

/** Recommended action from the sync. */
interface SyncAction {
  priority: number;
  action: string;
  tool: string;
  args?: Record<string, unknown>;
  reason: string;
}

// ── Handler ───────────────────────────────────────────────────────

/** Handle the project_sync_all tool call. */
export async function handleProjectSyncAll(
  args: Record<string, unknown>,
): Promise<SyncReport> {
  const projectPath = (args.project_path as string) || process.cwd();
  const includeReview = args.include_review !== false; // default true
  const includeGit = args.include_git !== false; // default true

  const findings: SyncFinding[] = [];
  const actions: SyncAction[] = [];

  // ── 1. Scan all entities ────────────────────────────────────────
  const [allTasks, allPrds, allAdrs, board] = await Promise.all([
    scanTasks(projectPath),
    scanPrds(projectPath),
    scanAdrs(projectPath),
    scanBoard(projectPath),
  ]);

  // ── 2. PRD Health ───────────────────────────────────────────────
  const prdStatuses: PrdSyncStatus[] = [];
  for (const prd of allPrds) {
    const linkedTasks = allTasks.filter((t) => t.prdRef?.includes(prd.filename));
    const todo = linkedTasks.filter((t) => t.status === "todo").length;
    const wip = linkedTasks.filter((t) => t.status === "wip").length;
    const done = linkedTasks.filter((t) => t.status === "done").length;
    const issues: string[] = [];
    let health: HealthStatus = "ok";

    if (linkedTasks.length === 0 && prd.status !== "shipped") {
      issues.push("PRD has no linked tasks — work not started or tasks are missing");
      health = "warning";
      findings.push({
        category: "prd",
        severity: "warning",
        title: `PRD ${prd.id} has no tasks`,
        detail: `"${prd.title}" has no linked task files. Create tasks or mark PRD as shipped.`,
        suggested_tool: "task_create",
        suggested_args: { prd_ref: `docs/prd/${prd.filename}` },
      });
    }

    if (prd.status === "draft" && linkedTasks.length > 0 && done > 0) {
      issues.push("PRD still draft but has completed tasks — update PRD status");
      health = "warning";
      findings.push({
        category: "prd",
        severity: "action_required",
        title: `PRD ${prd.id} status out of date`,
        detail: `"${prd.title}" is still draft but has ${done} done task(s). Update PRD status.`,
        suggested_tool: "docs_sync",
        suggested_args: { target_file: `docs/prd/${prd.filename}` },
      });
    }

    if (linkedTasks.length > 0 && todo === 0 && wip === 0 && prd.status !== "shipped") {
      issues.push("All tasks done but PRD not shipped — update PRD status to shipped");
      health = "warning";
      actions.push({
        priority: 2,
        action: `Mark PRD ${prd.id} as shipped`,
        tool: "docs_sync",
        args: { target_file: `docs/prd/${prd.filename}` },
        reason: `All ${done} tasks are done but PRD is still "${prd.status}".`,
      });
    }

    prdStatuses.push({
      id: prd.id,
      title: prd.title,
      status: prd.status,
      health,
      task_count: linkedTasks.length,
      tasks_todo: todo,
      tasks_wip: wip,
      tasks_done: done,
      issues,
    });
  }

  // Orphan tasks (no PRD reference)
  const orphanTasks = allTasks.filter(
    (t) => !t.prdRef && t.status !== "done",
  );
  if (orphanTasks.length > 0) {
    findings.push({
      category: "task",
      severity: "warning",
      title: `${orphanTasks.length} task(s) without PRD reference`,
      detail: `Tasks ${orphanTasks.map((t) => t.id).join(", ")} have no PRD link. Consider creating a PRD or adding prd_ref.`,
    });
  }

  // ── 3. Task Health ──────────────────────────────────────────────
  const taskStatuses: TaskSyncStatus[] = [];
  for (const task of allTasks) {
    const issues: string[] = [];
    let health: HealthStatus = "ok";

    // Check acceptance criteria completion
    const total = task.acceptance.length;
    const done = task.acceptance.filter((a) => a.checked).length;

    if (task.status === "done" && total > 0 && done < total) {
      issues.push(`Task marked done but only ${done}/${total} criteria checked`);
      health = "warning";
      findings.push({
        category: "task",
        severity: "action_required",
        title: `Task ${task.id} has unchecked criteria`,
        detail: `"${task.goal}" is done but ${total - done} acceptance criteria are unchecked.`,
        suggested_tool: "task_update",
        suggested_args: { task_id: task.id, action: "tick" },
      });
    }

    if (task.status === "wip") {
      // WIP tasks — check for drift
      let driftStatus: "clean" | "drifted" | "unknown" = "unknown";
      try {
        const drift = await checkDrift(projectPath, task.id);
        if (drift.unexpectedFiles.length > 0 || drift.missingFiles.length > 0) {
          driftStatus = "drifted";
          issues.push(`Scope drift detected: ${drift.unexpectedFiles.length} unexpected, ${drift.missingFiles.length} missing files`);
          health = "warning";
          findings.push({
            category: "code",
            severity: "warning",
            title: `Task ${task.id} has scope drift`,
            detail: `Unexpected: [${drift.unexpectedFiles.join(", ")}]. Missing: [${drift.missingFiles.join(", ")}]`,
            suggested_tool: "task_drift_check",
            suggested_args: { task_id: task.id },
          });
        } else {
          driftStatus = "clean";
        }
      } catch {
        driftStatus = "unknown";
      }

      taskStatuses.push({
        id: task.id,
        goal: task.goal,
        status: task.status,
        health,
        has_prd: !!task.prdRef,
        acceptance_total: total,
        acceptance_done: done,
        drift_status: driftStatus,
        issues,
      });
    } else {
      taskStatuses.push({
        id: task.id,
        goal: task.goal,
        status: task.status,
        health,
        has_prd: !!task.prdRef,
        acceptance_total: total,
        acceptance_done: done,
        issues,
      });
    }
  }

  // ── 4. Git Status ───────────────────────────────────────────────
  let gitStatus: GitStatus | undefined;
  if (includeGit) {
    try {
      const { stdout: branchOut } = await exec(
        "git", ["branch", "--show-current"],
        { cwd: projectPath },
      );
      const branch = branchOut.trim();

      let uncommitted = 0;
      let untracked = 0;
      try {
        const { stdout: statusOut } = await exec(
          "git", ["status", "--porcelain"],
          { cwd: projectPath },
        );
        const lines = statusOut.trim().split("\n").filter((l) => l.length > 0);
        for (const line of lines) {
          if (line.startsWith("??")) {
            untracked++;
          } else {
            uncommitted++;
          }
        }
      } catch { /* git not available */ }

      let ahead = 0;
      let behind = 0;
      try {
        const { stdout: logOut } = await exec(
          "git", ["rev-list", "--left-right", "--count", `origin/${branch}...HEAD`],
          { cwd: projectPath },
        );
        const parts = logOut.trim().split(/\s+/);
        behind = parseInt(parts[0] || "0", 10);
        ahead = parseInt(parts[1] || "0", 10);
      } catch { /* no remote tracking */ }

      // Check for stale worktrees
      const staleWorktrees: string[] = [];
      const worktreeDir = join(projectPath, ".worktrees");
      if (existsSync(worktreeDir)) {
        try {
          const entries = await readdir(worktreeDir);
          for (const entry of entries) {
            const taskMatch = allTasks.find((t) => t.id === entry);
            if (taskMatch && taskMatch.status === "done") {
              staleWorktrees.push(entry);
            }
          }
        } catch { /* skip */ }
      }

      if (staleWorktrees.length > 0) {
        findings.push({
          category: "git",
          severity: "warning",
          title: `${staleWorktrees.length} stale worktree(s)`,
          detail: `Worktrees for done tasks: ${staleWorktrees.join(", ")}. Clean up with worktree_cleanup.`,
          suggested_tool: "worktree_cleanup",
        });
      }

      if (uncommitted > 0) {
        findings.push({
          category: "git",
          severity: "info",
          title: `${uncommitted} uncommitted change(s)`,
          detail: `There are ${uncommitted} modified files and ${untracked} untracked files.`,
        });
      }

      gitStatus = { branch, uncommitted_files: uncommitted, untracked_files: untracked, ahead, behind, stale_worktrees: staleWorktrees };
    } catch {
      // Git not available — skip
    }
  }

  // ── 5. Memory Status ────────────────────────────────────────────
  let memoryStatus: MemoryStatus = {
    total_memories: 0,
    categories: {},
    brain_exists: false,
    brain_stale: false,
  };

  try {
    const store = createMemoryBackend(projectPath);
    try {
      const all = await Promise.resolve(store.overview());
      const cats: Record<string, number> = {};
      for (const m of all) {
        cats[m.category] = (cats[m.category] || 0) + 1;
      }
      memoryStatus.total_memories = all.length;
      memoryStatus.categories = cats;
    } finally {
      store.close();
    }
  } catch { /* no memory store */ }

  // Check brain freshness
  const brainPath = join(projectPath, "docs", "PROJECT_BRAIN.md");
  if (existsSync(brainPath)) {
    memoryStatus.brain_exists = true;
    try {
      const brainStat = await stat(brainPath);
      const ageHours = (Date.now() - brainStat.mtimeMs) / 1000 / 3600;
      if (ageHours > 24) {
        memoryStatus.brain_stale = true;
        findings.push({
          category: "memory",
          severity: "warning",
          title: "PROJECT_BRAIN.md is stale",
          detail: `Last updated ${Math.round(ageHours)}h ago. Regenerate to capture recent learnings.`,
          suggested_tool: "memory_brain_sync",
        });
        actions.push({
          priority: 3,
          action: "Regenerate PROJECT_BRAIN.md",
          tool: "memory_brain_sync",
          reason: `Brain document is ${Math.round(ageHours)}h old.`,
        });
      }
    } catch { /* skip */ }
  } else {
    findings.push({
      category: "memory",
      severity: "action_required",
      title: "No PROJECT_BRAIN.md found",
      detail: "Generate it to give new agents instant project context.",
      suggested_tool: "memory_brain_sync",
    });
    actions.push({
      priority: 1,
      action: "Generate PROJECT_BRAIN.md",
      tool: "memory_brain_sync",
      reason: "No brain document exists for onboarding.",
    });
  }

  // ── 6. Docs Freshness ──────────────────────────────────────────
  const agentsPath = join(projectPath, "AGENTS.md");
  if (existsSync(agentsPath)) {
    try {
      const agentsStat = await stat(agentsPath);
      const ageHours = (Date.now() - agentsStat.mtimeMs) / 1000 / 3600;
      if (ageHours > 48) {
        findings.push({
          category: "docs",
          severity: "warning",
          title: "AGENTS.md is stale",
          detail: `Last updated ${Math.round(ageHours)}h ago. Regenerate to reflect current project state.`,
          suggested_tool: "agents_generate",
        });
        actions.push({
          priority: 4,
          action: "Regenerate AGENTS.md",
          tool: "agents_generate",
          reason: `AGENTS.md is ${Math.round(ageHours)}h old.`,
        });
      }
    } catch { /* skip */ }
  }

  // ── 7. Review Checklists ────────────────────────────────────────
  if (includeReview) {
    const wipTasks = allTasks.filter((t) => t.status === "wip");
    if (wipTasks.length > 0) {
      findings.push({
        category: "review",
        severity: "info",
        title: `${wipTasks.length} WIP task(s) need review before moving to done`,
        detail: `Run security and performance reviews on: ${wipTasks.map((t) => t.id).join(", ")}`,
      });

      actions.push({
        priority: 5,
        action: "Run security review on WIP tasks",
        tool: "docs_sync",
        args: { target_file: "kanban://review/security" },
        reason: `${wipTasks.length} task(s) in WIP need security review before done.`,
      });

      actions.push({
        priority: 6,
        action: "Run performance review on WIP tasks",
        tool: "docs_sync",
        args: { target_file: "kanban://review/performance" },
        reason: `${wipTasks.length} task(s) in WIP need performance review before done.`,
      });
    }

    // Check for done tasks without compound learnings
    const doneTasks = allTasks.filter((t) => t.status === "done");
    if (doneTasks.length > 0 && memoryStatus.total_memories === 0) {
      findings.push({
        category: "review",
        severity: "action_required",
        title: "Done tasks exist but no memories extracted",
        detail: `${doneTasks.length} task(s) completed but memory store is empty. Run compound_learnings to extract knowledge.`,
        suggested_tool: "compound_learnings",
      });
      actions.push({
        priority: 2,
        action: "Extract compound learnings from done tasks",
        tool: "compound_learnings",
        reason: `${doneTasks.length} done task(s) have no extracted memories.`,
      });
    }
  }

  // ── 8. Memory Dedup ─────────────────────────────────────────────
  if (memoryStatus.total_memories > 10) {
    actions.push({
      priority: 7,
      action: "Run memory deduplication sweep",
      tool: "memory_dedupe",
      args: { dry_run: true },
      reason: `${memoryStatus.total_memories} memories — check for duplicates.`,
    });
  }

  // ── Build Summary ───────────────────────────────────────────────
  const todoCount = allTasks.filter((t) => t.status === "todo").length;
  const wipCount = allTasks.filter((t) => t.status === "wip").length;
  const doneCount = allTasks.filter((t) => t.status === "done").length;
  const blockedCount = allTasks.filter((t) => t.status === "blocked").length;
  const actionRequired = findings.filter((f) => f.severity === "action_required").length;

  // Sort actions by priority
  actions.sort((a, b) => a.priority - b.priority);

  // Overall health
  let overallHealth: HealthStatus = "ok";
  if (actionRequired > 0) overallHealth = "error";
  else if (findings.filter((f) => f.severity === "warning").length > 0) overallHealth = "warning";

  const summaryParts: string[] = [];
  summaryParts.push(`${allPrds.length} PRDs, ${allTasks.length} tasks (${todoCount} todo, ${wipCount} wip, ${doneCount} done)`);
  if (actionRequired > 0) summaryParts.push(`⚠️ ${actionRequired} action(s) required`);
  if (findings.length > 0) summaryParts.push(`${findings.length} total findings`);
  if (actions.length > 0) summaryParts.push(`${actions.length} recommended actions`);

  return {
    timestamp: new Date().toISOString(),
    project_path: projectPath,
    summary: summaryParts.join(". "),
    health: overallHealth,
    stats: {
      total_prds: allPrds.length,
      total_tasks: allTasks.length,
      total_adrs: allAdrs.length,
      tasks_todo: todoCount,
      tasks_wip: wipCount,
      tasks_done: doneCount,
      tasks_blocked: blockedCount,
      findings_count: findings.length,
      action_required_count: actionRequired,
    },
    prds: prdStatuses,
    tasks: taskStatuses,
    git: gitStatus,
    memory: memoryStatus,
    findings,
    recommended_actions: actions,
  };
}
