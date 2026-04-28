# PRD-0005: Lifecycle Hooks and Drift Detection

> Status: draft
> Owner: dila
> Created: 2026-04-28

## Problem

There are no guardrails when tasks transition between statuses. An agent can move a task to 'done' without running tests, checking for drift from the plan, or performing reviews. Inspired by OMX's hook system and drift detection, we need: (1) a `.agents/hooks/` directory with markdown hook files that are automatically surfaced during task transitions, and (2) a drift detection tool that compares expected file changes against actual git diff output.

## Users

- AI agents following structured workflows
- Developers who want quality gates enforced automatically

## User Stories

- As a **developer**, I want **agents to automatically see a checklist when starting a task**, so that **they don't skip critical setup steps**.
- As a **developer**, I want **to know if an agent modified files outside the expected scope**, so that **I can catch scope creep early**.
- As an **agent**, I want **hook instructions returned with task transitions**, so that **I follow the project's workflow without being reminded**.

## Acceptance Criteria

### Lifecycle Hooks
- [ ] New directory convention: `.agents/hooks/` with markdown hook files
- [ ] Supported hooks: `on-task-start.md`, `on-task-done.md`, `pre-commit.md`
- [ ] Core function `scanHooks(projectPath)` returns available hooks
- [ ] Core function `getHookContent(projectPath, hookName)` returns markdown content
- [ ] `task_move` MCP tool automatically includes relevant hook content in response
- [ ] Hook templates included in `create-kanban-app` scaffold
- [ ] Hooks are rendered in the VS Code Docs tab under a "Hooks" sub-tab

### Drift Detection
- [ ] New MCP tool `task_drift_check` that accepts a task ID
- [ ] Compares `filesAffected` from task spec with `git diff --name-only` in the worktree
- [ ] Returns `{ onTrack: boolean, unexpectedFiles: string[], missingFiles: string[], checkedCriteria: number, totalCriteria: number }`
- [ ] Warns if files outside expected scope were modified
- [ ] At least one test validates drift detection logic

## Out of Scope

- Blocking task transitions (hooks are advisory, not gates)
- Custom scripting language for hooks (markdown only — agents read them as instructions)
- Auto-running tests (hooks tell the agent to run tests; they don't execute them)

## Open Questions

- Should hooks be project-level (`.agents/hooks/`) or also template-level (`templates/shared/`)?
- Should `task_drift_check` require a worktree, or can it work on the main branch too?

## References

- Inspired by: Oh My Codex hook system (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`)
- Inspired by: Oh My Codex drift detection at session start
- Related ADRs: (none yet)

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-{id}-lifecycle-hooks.md`
- [ ] `docs/tasks/todo-{id}-drift-detection-tool.md`
