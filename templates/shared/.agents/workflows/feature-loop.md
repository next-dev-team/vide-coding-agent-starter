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
2. Read any relevant skill files in `.agents/skills/`
3. Write the test first when the change is logic-heavy; write the UI first when it's UI-heavy
4. Implement
5. Run lint/analyze and tests (see AGENTS.md for project-specific commands)
6. Update the task's "Notes" section with anything surprising

**If you hit a real decision** (which package, which pattern, breaking schema change), pause and write an ADR before continuing.

## Step 4 — Review

Self-check before declaring done:

| Check | How |
|---|---|
| Compiles | Build completes with no errors |
| Tested | Tests pass; new behavior has a test |
| No lint warnings | Lint/analyze output clean |
| Conventions followed | See AGENTS.md coding conventions |
| Task acceptance met | Re-read the task's acceptance list |
| Decisions logged | ADR exists if anything non-obvious was chosen |

## Step 5 — Done

- Rename task file: `wip-...` → `done-...`
- If the PRD is fully delivered, add a one-line "Status: shipped on YYYY-MM-DD" at the top of the PRD file.

## When Things Go Sideways

| Situation | What to do |
|---|---|
| PRD acceptance criteria contradict each other | Stop. Surface the conflict to the user. Don't guess. |
| Task is bigger than expected | Split it. Create new task files. Rename the original to `blocked-` and note "split into 0007a, 0007b". |
| You need a decision the PRD doesn't cover | Write an ADR proposal (status: proposed) and ask the user to confirm. |
| Tests fail and you can't see why | Don't disable the test. Add a Note to the task and surface to the user. |
