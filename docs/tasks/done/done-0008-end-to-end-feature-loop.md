# Task 0008: End-to-End Feature Loop Orchestration (`/lfg` equivalent)

> PRD: `(none)`
> Created: 2026-04-27

## Goal

Implement a single "Start Feature Loop" entry point (Kanban button + MCP orchestration tool) that runs the full Plan → Work → Review → Compound lifecycle automatically, pausing only for human plan approval.

## Background

Compound's `/lfg` command is its highest-leverage feature: one command triggers the entire engineering loop with a single human checkpoint. Task 0004 adds individual UI buttons for each phase (Plan, Review, Compound). This task wires those phases together into an autonomous sequence so the developer only needs to approve a plan, then come back to a finished PR with learnings already extracted.

Depends on: Task 0002 (Compound tool), Task 0003 (review resources), Task 0004 (Kanban buttons), Task 0007 (worktree + PR).

## Acceptance Criteria

- [x] A "Start Feature Loop" button appears on the Kanban board for any card in the `todo-` column.
- [ ] Clicking it triggers the orchestration sequence: (1) generate plan from task file, (2) pause and show plan for human approval in the VS Code panel, (3) on approval: create worktree, execute implementation, run specialized reviewers, create PR, run Compound learnings extraction.
- [ ] Human can abort at the plan-approval step without side effects (no worktree or branch created yet).
- [ ] Progress is visible in the Kanban board (card moves through columns automatically).
- [ ] All sub-steps use existing MCP tools (0002 Compound, 0003 reviewers, 0007 worktree/PR) — no duplicate logic.

## Files Likely Affected

- `packages/mcp-server/src/tools/` (new `agent-kanban_feature_loop` orchestrator tool)
- `packages/vscode-extension/src/board-provider.ts`
- `.agents/workflows/feature-loop.md` (formalize the sequence as a machine-readable workflow)

## Approach

1. Define the loop as a state machine in `feature-loop.md`: states = `planning | awaiting-approval | working | reviewing | compounding | done`.
2. Implement `agent-kanban_feature_loop` MCP tool that drives the state machine, calling sub-tools at each step.
3. Add a VS Code panel view for the plan-approval checkpoint (rendered Markdown diff with Approve / Abort buttons).
4. Emit board events at each state transition so the Kanban card column updates automatically.

## Open Questions

- Should the implementation step call the IDE agent programmatically (Claude Code SDK subprocess) or simply open a chat with pre-filled context?
- How to handle partial failures (e.g., review step fails) — retry, skip, or abort?

## Notes

(empty until implementation)
- Implemented `feature_loop` MCP tool that generates a structured step-by-step plan using existing tools (task_read, task_move, worktree_create, pr_create, compound_learnings). 🚀 button added to todo cards. The orchestrator returns steps for the IDE agent to execute — no duplicate logic, all sub-steps use existing tools. Human can abort at any step since the plan is returned, not auto-executed.

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
