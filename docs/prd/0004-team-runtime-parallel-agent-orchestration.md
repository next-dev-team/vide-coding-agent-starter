# PRD-0004: Team Runtime — Parallel Agent Orchestration

> Status: draft
> Owner: dila
> Created: 2026-04-28

## Problem

Agent Kanban supports git worktrees for task isolation, but spawning multiple parallel agent sessions is entirely manual. Users must open multiple IDE windows and assign tasks by hand. Inspired by OMX's `$team` runtime, we need an MCP tool and optional CLI command that auto-spawns N workers (each with its own worktree and branch), monitors their status, and provides a unified team view — while remaining agent-agnostic.

## Users

- Developers running large refactors or multi-task sprints
- AI agents coordinating sub-task distribution

## User Stories

- As a **developer**, I want to **spawn 3 parallel agents on tasks 0001, 0003, 0004 with one command**, so that **I don't manually open windows and assign work**.
- As a **developer**, I want to **see all active workers and their progress in one view**, so that **I can monitor the team without switching windows**.
- As an **agent**, I want to **report my status to a shared team state**, so that **other agents and the user can see what I'm working on**.

## Acceptance Criteria

- [ ] New MCP tool `team_spawn` that accepts `{ taskIds: string[], agent?: string }` and creates worktrees + launch scripts
- [ ] New MCP tool `team_status` that reads all WIP tasks + worktree existence and returns team state
- [ ] New MCP tool `team_shutdown` that cleans up worktrees and moves tasks back if incomplete
- [ ] Shared state file `.agent-kanban/team-state.json` tracks active workers
- [ ] Launch scripts support at least: `codex`, `claude`, `code` (VS Code terminal)
- [ ] VS Code sidebar shows team worker count in status bar
- [ ] Works on macOS, Linux, and Windows (no tmux dependency — use platform-native terminals)
- [ ] At least one test validates spawn → status → shutdown lifecycle

## Out of Scope

- Real-time inter-agent communication (agents coordinate through task files + memory)
- Worker auto-scaling or load balancing
- tmux requirement (we use platform-native approaches instead)

## Open Questions

- Should `team_spawn` actually launch processes, or just generate the scripts for the user to execute?
- How to handle Windows where tmux isn't available? Use `wt.exe` (Windows Terminal) or VS Code terminals?
- Should worker agents auto-report heartbeats, or is polling `team_status` sufficient?

## References

- Inspired by: Oh My Codex `$team` runtime and `omx team status`
- Existing: `worktree_create`, `worktree_cleanup` MCP tools
- Related ADRs: (none yet)

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-{id}-team-spawn-tool.md`
- [ ] `docs/tasks/todo-{id}-team-status-tool.md`
- [ ] `docs/tasks/todo-{id}-team-vscode-panel.md`
