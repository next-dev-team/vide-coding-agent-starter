# Skill: Writing New Tasks

Read this **before** creating any file in `docs/tasks/`. A good task file is the difference between an agent finishing in 30 minutes and an agent rewriting your codebase for two hours.

## When to Write a Task

| Situation                                   | Write a task?                                                        |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Implementing a PRD's acceptance criterion   | ✅ Yes                                                               |
| Bug with non-obvious fix or >1 file touched | ✅ Yes                                                               |
| Refactor that changes multiple files        | ✅ Yes                                                               |
| One-line bug fix                            | ❌ Just fix it                                                       |
| Pure formatting / lint cleanup              | ❌ Just do it                                                        |
| Dependency version bump (no API change)     | ❌ Just do it                                                        |
| Spike / exploration with unknown outcome    | ⚠️ Write a "spike" task with timebox, not normal acceptance criteria |

## Sizing Rules

A task must fit **one focused agent session** (roughly 30–60 minutes of work). Concretely:

| Metric               | Limit                         |
| -------------------- | ----------------------------- |
| Files touched        | ≤ 5                           |
| New + changed lines  | ≤ 300                         |
| Public API additions | ≤ 1 new module/component     |
| New packages added   | 0 (needs ADR + user approval) |

**If you exceed any of these, split.** It's better to write 3 small tasks than 1 vague one.

## File Naming

```
docs/tasks/{prefix}-{NNNN}-{slug}.md
```

| Part     | Rules                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ |
| `prefix` | `todo-`, `wip-`, `done-`, or `blocked-`                                                    |
| `NNNN`   | Zero-padded sequential. Match the PRD number; sub-letter (`0001a`, `0001b`) when splitting |
| `slug`   | kebab-case, ≤ 5 words, verb-first (`add-todo-input`, `persist-on-restart`)                 |

**You change status by renaming the file.** Don't add a "Status:" field inside.

## The Six Sections

Every task file has exactly these sections, in this order:

```
1. Goal              ← one sentence
2. Acceptance        ← testable checklist
3. Files Affected    ← your best guess
4. Approach          ← 3–5 bullets, max
5. Open Questions    ← resolve before starting if possible
6. Notes             ← filled during implementation
```

### 1. Goal

**One sentence.** Present tense. Active voice.

| ✅ Good                                                             | ❌ Bad                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------ |
| "Add an input field on the todos screen so users can create todos." | "Working on the todo input feature and related stuff." |
| "Persist todos to local storage so they survive a page reload."     | "Storage layer."                                       |
| "Reject empty submissions in the add-todo flow."                    | "Fix some validation bugs."                            |

If you can't state the goal in one sentence, the task is two tasks.

### 2. Acceptance Criteria

The most important section. **Each item must be testable** — you (or a CI run) can give it a binary yes/no.

Format: checkbox list. Use `[ ]` initially; tick to `[x]` as you complete during implementation.

| ✅ Testable                                 | ❌ Not testable        |
| ------------------------------------------- | ---------------------- |
| `[ ] Input field renders on the todos screen`   | `[ ] Input looks good` |
| `[ ] Submitting empty title is a no-op`         | `[ ] Validation works` |
| `[ ] Build completes with 0 warnings`           | `[ ] Code is clean`    |
| `[ ] Unit test covers add() happy path`         | `[ ] Has tests`        |
| `[ ] List scrolls to newest item after add`     | `[ ] UX is smooth`     |

**Always include these three structural criteria** at the bottom:

```
[ ] All tests pass (see AGENTS.md for command)
[ ] Build clean — no warnings or errors
[ ] Public APIs are documented
```

**Tie back to the PRD.** If your task implements PRD-0001's criteria #2 and #4, say so:

```
- [ ] Implements PRD-0001 AC #2 (persists across restart)
- [ ] Implements PRD-0001 AC #4 (empty title rejected)
```

### 3. Files Likely Affected

Best-effort list with one of three markers:

| Marker     | Meaning                       |
| ---------- | ----------------------------- |
| `— new`    | File doesn't exist yet        |
| `— edit`   | File exists, will be modified |
| `— delete` | File will be removed          |

Example:

```
- src/components/TodoInput.tsx — new
- src/components/TodoList.tsx — edit
- src/__tests__/TodoInput.test.tsx — new
```

It's OK to be wrong. Update during implementation. The point is to **force you to think about scope** before starting. If your list is >5 entries, the task is too big.

### 4. Approach

**3–5 bullets.** A sketch, not a tutorial.

| ✅ Good approach                                                         | ❌ Bad approach                             |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| 3–5 imperative bullets describing the path                               | 20-line paragraph of "here's what we'll do" |
| References patterns that already exist (`follow same shape as TodoTile`) | Reinvents from scratch                      |
| Names the tricky bit explicitly                                          | Glosses over the hard part                  |
| Cites the relevant skill file                                            | Re-explains it inline                       |

Example:

```
- Create TodoInput component with controlled text field
- On submit: trim, early return if empty, call addTodo()
- Scroll to bottom after successful add
- Follow existing component patterns in the project
```

If you can't fit it in 5 bullets, **the task is two tasks.**

### 5. Open Questions

Things you don't know that block or shape the work. Format: `Q1:`, `Q2:`, etc.

**Resolve before you start coding.** If a question can be answered by the user in 30 seconds, don't guess — ask.

| Type     | Example                                                                            |
| -------- | ---------------------------------------------------------------------------------- |
| Behavior | "What happens if the user spam-taps Add — do we throttle?"                         |
| Scope    | "Should this task also include the empty-state illustration, or is that separate?" |
| Visual   | "Should the input be FAB-style or a bottom sheet?"                                 |

When resolved, edit the line:

```
Q1: ... — Resolved: bottom sheet, matches the existing edit dialog.
```

If there are no open questions, write `(none)`. Don't delete the section.

### 6. Notes

**Empty when you create the task. Filled while you work.**

Capture anything that:

- Surprised you (a library quirk, an unexpected error)
- Was a real choice (one you'd want to remember in 3 months)
- Future-you would want to know

| ✅ Worth a note                                                            | ❌ Not worth a note       |
| -------------------------------------------------------------------------- | ------------------------- |
| "localStorage setItem is synchronous — no need for async wrapper"  | "Implemented add method"  |
| "ScrollController.animateTo > ensureVisible because we always want bottom" | "Used a ScrollController" |
| "Decided NOT to write an ADR — trade-off is too small"                     | "No ADR"                  |

If a Note represents a **real architectural decision**, promote it to an ADR (`docs/decisions/`) and link to it from the Note.

## Splitting Tasks

When a task is too big, split it. Patterns:

| Original                            | Split into                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| "Add filter UI for active/done/all" | `0007a` filter state provider, `0007b` filter chips UI, `0007c` apply filter to list |
| "Sync todos with backend"           | `0008a` API client, `0008b` sync service, `0008c` UI conflict resolution             |
| "Edit a todo"                       | `0009a` edit dialog, `0009b` notifier.update method, `0009c` persist edits           |

**Sub-letters share the parent number.** Sub-letters can run in any order if they're independent, or sequentially if `b` depends on `a`. State the dependency in the Goal:

```
# Task 0007b: Filter Chips UI
Goal: Render filter chips that toggle the filter state from 0007a.
Depends on: 0007a (must be done first)
```

## Anti-Patterns to Avoid

| Anti-pattern                                      | Why it fails                      | Fix                              |
| ------------------------------------------------- | --------------------------------- | -------------------------------- |
| **Vague goal** ("improve the todo screen")        | Agent doesn't know when it's done | Single-sentence specific goal    |
| **Untestable acceptance** ("looks nice")          | Nothing to verify against         | Make every line yes/no checkable |
| **Missing PRD link**                              | Loses the why                     | Always reference PRD in header   |
| **No file list**                                  | Reveals scope creep too late      | List files before starting       |
| **Long approach** (>5 bullets)                    | Task is too big                   | Split                            |
| **Mixed concerns** ("Add input + edit + delete")  | Three goals, one task             | Three tasks                      |
| **No open questions** when there clearly are some | Decisions get made silently       | Write them down, resolve them    |
| **Editing status inside the file**                | Two sources of truth              | Rename the file instead          |

## Worked Comparison

### ❌ Bad task

```markdown
# Task: Todo stuff

Need to make the todo list better. Add some way to create
todos and store them somewhere.

- [ ] Make it work
- [ ] Tests

Files: lots probably

Approach: figure it out as we go
```

Problems: vague goal, untestable acceptance, no file list, no PRD link, no approach, no scope.

### ✅ Good task

```markdown
# Task 0001: Add Todo Input

> PRD: docs/prd/0001-add-todo.md
> Created: 2026-04-26

## Goal

Add an input field on the todos screen so users can create todos that persist.

## Acceptance Criteria

- [ ] Input field + Add button visible on the todos screen
- [ ] Submitting non-empty title appends a todo (PRD-0001 AC #1)
- [ ] Todo persists across restart (PRD-0001 AC #2)
- [ ] Empty/whitespace title is a no-op (PRD-0001 AC #3)
- [ ] Input clears after successful add
- [ ] List scrolls to newest entry
- [ ] Unit test: add — happy path + empty rejection
- [ ] All tests pass (see AGENTS.md)
- [ ] Build clean
- [ ] Public APIs documented

## Files Likely Affected

- src/components/TodoInput.tsx — new
- src/components/TodoList.tsx — edit
- src/hooks/useTodos.ts — edit (add method)
- src/__tests__/TodoInput.test.tsx — new

## Approach

- Create TodoInput component with controlled text field
- On submit: trim, early-return if empty, call addTodo(), clear input
- Scroll to bottom after add
- Follow existing component patterns

## Open Questions

(none)

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick PRD AC #1, #2, #3
- [ ] No ADR needed (no novel decision)
```

## Quick Checklist Before You Save

- [ ] Filename has correct prefix + zero-padded number + kebab-case slug
- [ ] PRD reference at top
- [ ] Goal is one sentence
- [ ] Every acceptance criterion is testable
- [ ] Acceptance criteria reference PRD ACs by number where applicable
- [ ] Files list has ≤ 5 entries with `— new` / `— edit` / `— delete` markers
- [ ] Approach is ≤ 5 bullets
- [ ] Open Questions section is present (even if empty)
- [ ] No "Status:" field — status is in the filename prefix
