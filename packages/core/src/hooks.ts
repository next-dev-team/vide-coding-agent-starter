import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

// ─── Hook Types ────────────────────────────────────────────────────

/** Supported lifecycle hook names. */
export type HookName =
  | "on-task-start"
  | "on-task-done"
  | "pre-commit";

/** All valid hook names in order. */
export const HOOK_NAMES: readonly HookName[] = [
  "on-task-start",
  "on-task-done",
  "pre-commit",
] as const;

/** A discovered hook file. */
export interface HookInfo {
  /** Hook name (without .md extension). */
  name: HookName;
  /** Relative path from project root. */
  path: string;
  /** First non-empty line as description. */
  description: string;
}

/** A hook with its full content. */
export interface HookContent extends HookInfo {
  /** Full markdown content. */
  content: string;
}

// ─── Default Hook Templates ────────────────────────────────────────

const DEFAULT_HOOKS: Record<HookName, string> = {
  "on-task-start": `# On Task Start

**Auto-triggered when a task moves to WIP.**

Before writing any code:

1. **Read the task file** — understand the goal, acceptance criteria, and files affected
2. **Check memory** — run \`memory_find\` for related past work and patterns
3. **Read the PRD** — if the task references a PRD, read it for full context
4. **Create a worktree** — isolate your work on a dedicated branch
5. **Run the test suite** — establish a passing baseline before making changes
6. **Plan your approach** — outline the implementation steps before coding

> This hook runs automatically. The agent should follow these steps without prompting.
`,

  "on-task-done": `# On Task Done

**Auto-triggered when a task moves to DONE.**

Before marking complete, verify:

1. **All acceptance criteria checked** — every \`- [ ]\` should be \`- [x]\`
2. **Build passes** — run \`pnpm build\` (or project equivalent) with zero errors
3. **Tests pass** — run \`pnpm test\` with all tests green
4. **New code has tests** — at least one test covers the new behavior
5. **No TypeScript errors** — clean type-check
6. **Run drift check** — call \`task_drift_check\` to verify no unexpected scope creep
7. **Security review** — read \`kanban://review/security\` and check against changes
8. **Performance review** — read \`kanban://review/performance\` and check against changes
9. **Extract learnings** — call \`compound_learnings\` to persist knowledge

> This hook runs automatically. The agent should verify all items before completing the task.
`,

  "pre-commit": `# Pre-Commit Checklist

**Review before every git commit.**

- [ ] Changes are minimal and focused — no unrelated modifications
- [ ] No debug code left (console.log, TODO hacks, commented-out code)
- [ ] New public APIs have JSDoc comments
- [ ] File names follow project conventions (kebab-case)
- [ ] No secrets or credentials in the diff
- [ ] Commit message follows conventional format

> This hook is advisory. The agent should review this checklist before committing.
`,
};

// ─── Scanner ───────────────────────────────────────────────────────

/** Scan .agents/hooks/ for available lifecycle hooks. */
export async function scanHooks(projectPath: string): Promise<HookInfo[]> {
  const hooksDir = join(projectPath, ".agents", "hooks");
  if (!existsSync(hooksDir)) return [];

  const hooks: HookInfo[] = [];
  try {
    const entries = await readdir(hooksDir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const name = entry.replace(/\.md$/, "") as HookName;
      if (!HOOK_NAMES.includes(name)) continue;

      try {
        const content = await readFile(join(hooksDir, entry), "utf-8");
        const firstLine = content.split("\n").find(
          (line) => line.trim() && !line.startsWith("#") && !line.startsWith("---"),
        );
        hooks.push({
          name,
          path: `.agents/hooks/${entry}`,
          description: firstLine?.trim().slice(0, 120) ?? "",
        });
      } catch { /* skip unreadable */ }
    }
  } catch { /* directory not readable */ }

  return hooks;
}

/** Read the full content of a lifecycle hook. */
export async function getHookContent(
  projectPath: string,
  hookName: HookName,
): Promise<HookContent | null> {
  const hooksDir = join(projectPath, ".agents", "hooks");
  const filePath = join(hooksDir, `${hookName}.md`);

  try {
    const content = await readFile(filePath, "utf-8");
    const firstLine = content.split("\n").find(
      (line) => line.trim() && !line.startsWith("#") && !line.startsWith("---"),
    );
    return {
      name: hookName,
      path: `.agents/hooks/${hookName}.md`,
      description: firstLine?.trim().slice(0, 120) ?? "",
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Get hook content for a task transition, falling back to built-in defaults.
 * Returns null if no hook applies to this transition.
 */
export async function getTransitionHook(
  projectPath: string,
  newStatus: string,
): Promise<HookContent | null> {
  let hookName: HookName | null = null;

  if (newStatus === "wip") hookName = "on-task-start";
  else if (newStatus === "done") hookName = "on-task-done";

  if (!hookName) return null;

  // Try project-specific hook first
  const custom = await getHookContent(projectPath, hookName);
  if (custom) return custom;

  // Fall back to built-in default
  return {
    name: hookName,
    path: `(built-in default)`,
    description: `Default ${hookName} hook`,
    content: DEFAULT_HOOKS[hookName],
  };
}

/**
 * Initialize .agents/hooks/ with default hook templates.
 * Skips files that already exist.
 */
export async function initHooks(projectPath: string): Promise<string[]> {
  const hooksDir = join(projectPath, ".agents", "hooks");
  await mkdir(hooksDir, { recursive: true });

  const created: string[] = [];
  for (const name of HOOK_NAMES) {
    const filePath = join(hooksDir, `${name}.md`);
    if (!existsSync(filePath)) {
      await writeFile(filePath, DEFAULT_HOOKS[name], "utf-8");
      created.push(`${name}.md`);
    }
  }
  return created;
}
