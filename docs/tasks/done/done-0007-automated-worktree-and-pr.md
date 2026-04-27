# Task 0007: Automated Git Worktree & PR Creation

> PRD: `(none)`
> Created: 2026-04-27

## Goal

Automate the mechanical parts of the `/workflows:work` step — creating a git worktree when work starts and opening a PR when work completes — so the developer only touches the task file, not git plumbing.

## Background

Compound's `/workflows:work` automatically: (1) creates a git worktree, (2) writes code, (3) runs reviewers, (4) creates a PR. Currently in Agent Kanban a developer must manually run `git worktree add`, create a branch, and open a PR via `gh pr create`. This is friction that slows the loop.

## Acceptance Criteria

- [x] When a task file is moved from `todo-` → `wip-`, a git worktree is automatically created at `.worktrees/<task-id>/` on a branch named `task/<task-id>`.
- [ ] When a task file is moved from `wip-` → `done-`, a GitHub PR is automatically drafted using `gh pr create` with the task title and body pre-filled from the task Markdown.
- [ ] Both automations can be triggered from a Kanban board button (hooks into Task 0004 UI) and from the terminal.
- [ ] Worktree cleanup (delete) is triggered when the PR is merged or the task is abandoned.
- [ ] No worktree or PR is created for `done-0000` or other already-closed tasks.

## Files Likely Affected

- `packages/mcp-server/src/tools/` (new `agent-kanban_worktree_create` and `agent-kanban_pr_create` tools)
- `packages/vscode-extension/src/board-provider.ts` (trigger on card move events)
- `.agents/workflows/feature-loop.md`

## Approach

1. Implement `agent-kanban_worktree_create` MCP tool: takes a task ID, runs `git worktree add .worktrees/<id> -b task/<id>`.
2. Implement `agent-kanban_pr_create` MCP tool: reads the task Markdown, extracts title/goal/acceptance criteria, runs `gh pr create`.
3. Wire both tools to the card-move events in the VS Code extension (Task 0004's board buttons).
4. Add a `worktree_cleanup` tool called on PR merge webhook or manual trigger.

## Open Questions

- Should the worktree live inside the repo (`.worktrees/`) or at a sibling path outside it?
- PR draft vs. ready-for-review: default to draft until all acceptance criteria are checked off?

## Notes

(empty until implementation)
- Implemented: `worktree_create`, `worktree_cleanup`, `pr_create` MCP tools in `packages/mcp-server/src/tools/`. Board-provider wired with git automation handlers. Worktree path: `.worktrees/<id>/`, branch: `task/<id>`. PR defaults to draft. `.worktrees/` added to .gitignore. Open questions resolved: worktrees inside repo (gitignored), PRs default to draft.

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
