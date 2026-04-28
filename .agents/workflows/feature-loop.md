# Feature Loop

The process for turning an idea into shipped code with an AI agent.

```
   IDEA
    │
    ▼
┌─────────┐    ┌────────┐    ┌──────────┐    ┌────────┐    ┌──────┐
│  PRD    │ →  │ TASKS  │ →  │ IMPLEMENT │ → │ REVIEW │ →  │ DONE │
└─────────┘    └────────┘    └──────────┘    └────────┘    └──────┘
   what +       scoped        code + tests    analyze +      rename
   why          chunks                        test            file
                                  │
                                  ▼
                            ┌──────────┐
                            │   ADR    │  (if a real decision was made)
                            └──────────┘
```

## MCP Tools

| Tool | What it does |
|------|-------------|
| `feature_loop` | Generate a plan for **one task** — returns step-by-step orchestration sequence |
| `feature_loop_all` | Generate a plan for **all pending tasks** — returns batch plan with execution order, PRD coverage, and post-batch sync steps |

## feature_loop_all — Batch Mode

When called with no arguments, `feature_loop_all` scans the board and builds a plan for every `todo` task. Options:

| Param | Default | Description |
|-------|---------|-------------|
| `include_wip` | `false` | Also resume in-progress tasks |
| `include_done` | `false` | Run compound learnings on done tasks |
| `prd_filter` | — | Only tasks linked to a specific PRD |
| `skip_worktree` | `false` | Skip git worktree creation for all tasks |

**Execution order:** WIP tasks first (resume), then TODO by ID.

**Post-batch steps** (auto-included):
1. `docs_sync` — Reconcile PRDs/tasks with code
2. `memory_brain_sync` — Regenerate PROJECT_BRAIN.md
3. `agents_generate` — Rebuild AGENTS.md
4. `memory_dedupe` — Clean up duplicate memories

## Step 1 — PRD (Product Requirements Document)

**Purpose:** capture *what* and *why*, never *how*.

**File:** `docs/prd/NNNN-short-slug.md` using `.agents/templates/prd.md`.

**Numbering:** zero-padded sequential. `0001-add-todo.md`, `0002-filter-todos.md`.

**When to write one:**
- Any feature touching >1 file
- Any change a user would notice
- Anything you'd describe in a changelog entry

**Skip the PRD when:**
- Bug fix with obvious correct behavior
- Pure refactor with no behavior change
- Lint/format/dependency bump

## Step 2 — Tasks

**Purpose:** break the PRD into chunks an agent can finish in one session.

**File:** `docs/tasks/NNNN-short-slug.md` using `.agents/templates/task.md`. Same number as PRD when there's a 1:1 mapping; sub-number (`0001a`, `0001b`) when splitting.

**Status by filename prefix:**
- `todo-0001-...md` → not started
- `wip-0001-...md` → in progress
- `done-0001-...md` → completed
- `blocked-0001-...md` → blocked

**Sizing:** a task should fit one focused agent session (~30–60 min of work). If a task touches >5 files or >300 lines, split it.

**Each task lists:**
- The PRD it serves
- Acceptance criteria (testable)
- Files likely affected
- Any open questions

## Step 3 — Implement

**Order inside a task:**
1. Read the PRD and the task file
2. Search memory for related patterns (`memory_find`)
3. Read any relevant skill files in `.agents/skills/`
4. Write the test first when the change is logic-heavy
5. Implement
6. Run `pnpm build` and `pnpm test`
7. Update the task's "Notes" section with anything surprising

**If you hit a real decision** (which package, which pattern, breaking schema change), pause and write an ADR before continuing.

## Step 4 — Review

Self-check before declaring done:

| Check | How |
|---|---|
| Compiles | `pnpm build` clean |
| Tested | `pnpm test` passes; new behavior has a test |
| No lint warnings | No TypeScript errors |
| Conventions followed | kebab-case files, JSDoc, no `any` |
| Task acceptance met | Re-read the task's acceptance list |
| Decisions logged | ADR exists if anything non-obvious was chosen |
| Drift check | Run `task_drift_check` — verify changes match planned scope |

## Step 5 — Done

- Rename task file: `wip-...` → `done-...`
- Run `compound_learnings` to extract and persist reusable knowledge
- If the PRD is fully delivered, add a one-line "Status: shipped on YYYY-MM-DD" at the top of the PRD file.

## When Things Go Sideways

| Situation | What to do |
|---|---|
| PRD acceptance criteria contradict each other | Stop. Surface the conflict to the user. Don't guess. |
| Task is bigger than expected | Split it. Create new task files. Rename the original to `blocked-` and note "split into 0007a, 0007b". |
| You need a decision the PRD doesn't cover | Write an ADR proposal (status: proposed) and ask the user to confirm. |
| Tests fail and you can't see why | Don't disable the test. Add a Note to the task and surface to the user. |
