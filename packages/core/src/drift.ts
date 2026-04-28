import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { scanTasks } from "./scanner.js";

const exec = promisify(execFile);

// ─── Types ─────────────────────────────────────────────────────────

/** Result of a drift check against a task's expected file scope. */
export interface DriftReport {
  /** Task ID checked. */
  taskId: string;
  /** Whether the changes are on track with the plan. */
  onTrack: boolean;
  /** Files modified that weren't listed in the task spec. */
  unexpectedFiles: string[];
  /** Files listed in the task spec that haven't been modified yet. */
  missingFiles: string[];
  /** Files that match the expected scope. */
  matchedFiles: string[];
  /** Number of checked acceptance criteria. */
  checkedCriteria: number;
  /** Total acceptance criteria. */
  totalCriteria: number;
  /** Percentage of criteria completed. */
  criteriaProgress: number;
  /** Human-readable summary. */
  summary: string;
}

// ─── Drift Checker ─────────────────────────────────────────────────

/**
 * Check if actual code changes align with the task's planned file scope.
 * Compares `filesAffected` from the task spec against `git diff --name-only`.
 */
export async function checkDrift(
  projectPath: string,
  taskId: string,
): Promise<DriftReport> {
  // Find the task
  const tasks = await scanTasks(projectPath);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Get expected files from task spec
  const expectedFiles = task.filesAffected.map((f) => f.trim()).filter(Boolean);

  // Get actual changed files from git
  let actualFiles: string[] = [];
  const worktreePath = join(projectPath, ".worktrees", taskId);
  const cwd = existsSync(worktreePath) ? worktreePath : projectPath;

  try {
    // Try diff against main/master first
    let baseBranch = "main";
    try {
      await exec("git", ["rev-parse", "--verify", "main"], { cwd });
    } catch {
      try {
        await exec("git", ["rev-parse", "--verify", "master"], { cwd });
        baseBranch = "master";
      } catch {
        // Neither main nor master exists — diff against HEAD
        baseBranch = "HEAD";
      }
    }

    if (baseBranch === "HEAD") {
      // Just check uncommitted changes
      const { stdout } = await exec("git", ["diff", "--name-only", "HEAD"], { cwd });
      actualFiles = stdout.trim().split("\n").filter(Boolean);
    } else {
      // Diff against base branch
      const { stdout: committed } = await exec(
        "git", ["diff", "--name-only", baseBranch],
        { cwd },
      );
      const { stdout: staged } = await exec(
        "git", ["diff", "--name-only", "--staged"],
        { cwd },
      );
      const { stdout: unstaged } = await exec(
        "git", ["diff", "--name-only"],
        { cwd },
      );
      const all = new Set([
        ...committed.trim().split("\n").filter(Boolean),
        ...staged.trim().split("\n").filter(Boolean),
        ...unstaged.trim().split("\n").filter(Boolean),
      ]);
      actualFiles = [...all];
    }
  } catch {
    // Git not available or not a repo — return partial report
    actualFiles = [];
  }

  // Normalize paths for comparison
  const normalize = (p: string) => p.replace(/\\/g, "/").replace(/^\.\//, "");
  const normalizedExpected = new Set(expectedFiles.map(normalize));
  const normalizedActual = new Set(actualFiles.map(normalize));

  // Compute drift
  const matchedFiles = actualFiles.filter((f) => normalizedExpected.has(normalize(f)));
  const unexpectedFiles = actualFiles.filter((f) => !normalizedExpected.has(normalize(f)));
  const missingFiles = expectedFiles.filter((f) => !normalizedActual.has(normalize(f)));

  // Check acceptance criteria progress
  const checkedCriteria = task.acceptance.filter((a) => a.checked).length;
  const totalCriteria = task.acceptance.length;
  const criteriaProgress = totalCriteria > 0
    ? Math.round((checkedCriteria / totalCriteria) * 100)
    : 100;

  // Determine if on track
  const hasNoExpectedFiles = expectedFiles.length === 0;
  const onTrack = hasNoExpectedFiles
    ? true // No file scope defined — can't drift
    : unexpectedFiles.length === 0;

  // Build summary
  const parts: string[] = [];
  if (hasNoExpectedFiles) {
    parts.push("⚠️ No file scope defined in task — drift check skipped.");
  } else if (onTrack) {
    parts.push(`✅ On track — ${matchedFiles.length}/${expectedFiles.length} expected files modified.`);
  } else {
    parts.push(`⚠️ Scope drift detected — ${unexpectedFiles.length} unexpected file(s) modified.`);
  }

  if (missingFiles.length > 0) {
    parts.push(`📋 ${missingFiles.length} expected file(s) not yet modified.`);
  }

  parts.push(`✅ Criteria: ${checkedCriteria}/${totalCriteria} (${criteriaProgress}%)`);

  return {
    taskId,
    onTrack,
    unexpectedFiles,
    missingFiles,
    matchedFiles,
    checkedCriteria,
    totalCriteria,
    criteriaProgress,
    summary: parts.join("\n"),
  };
}
