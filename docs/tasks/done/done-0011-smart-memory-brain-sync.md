# Task 0011: Smart Memory Brain Sync

> PRD: `docs/prd/0006-smart-memory-brain-onboarding-context.md`
> Created: 2026-04-28

## Goal

Implement a Smart Memory Brain tool that generates a unified PROJECT_BRAIN.md digest from the memory engine, giving new developers and agents instant holistic project context.

## Acceptance Criteria

- [x] A new MCP tool `agent-kanban_memory_brain_sync` is added.
- [x] It queries the memory backend using `overview()` to get all L0 memories.
- [x] It generates `docs/PROJECT_BRAIN.md` grouped by category, concatenating the abstracts.
- [x] The `agents_generate` tool is updated to link to `PROJECT_BRAIN.md` inside `AGENTS.md`.
- [x] Tests are updated to cover `memory_brain_sync`.
- [x] `pnpm test` and `pnpm build` pass.

## Files Likely Affected

(TBD)

## Approach

(TBD)

## Open Questions

(none)

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
