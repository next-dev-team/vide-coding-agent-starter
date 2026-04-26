# Task 0009: Manual Memory Dedup MCP Tool (`memory_dedupe`)

> PRD: `(none)`
> Created: 2026-04-27
> ADR: `docs/decisions/0004-memory-backend-decision.md`
> Depends on: Task 0002 (dedup logic), Task 0005 (MemoryStore)

## Goal

Expose on-demand deduplication of the full memory store as a single MCP tool
(`agent-kanban_memory_dedupe`) so a developer or agent can trigger a "clean up duplicate
memories" pass at any time, with a human-review diff before anything is committed.

## Background

Task 0002's dedup runs automatically at extraction time (per task). But as the memory
store grows across many tasks, cross-task duplicates can accumulate — especially in
`code_style` and `workflow` categories where multiple tasks may produce similar one-liners.

This task adds an *on-demand* full-store dedup sweep. It is **not** an automated background
agent (the original Task 0009 scope was "automated garbage collection" — that was
over-engineered for v1). The human always sees the proposed changes before they apply.

## Acceptance Criteria

- [ ] New MCP tool `agent-kanban_memory_dedupe` in `packages/mcp-server/src/tools/memory-dedupe.ts`.
- [ ] Tool accepts optional `category` filter; defaults to scanning all 8 categories.
- [ ] Tool calls `store.overview()` to load all L0 abstracts, runs pairwise dedup (reuse `deduplicateMemories` from Task 0002) within each category.
- [ ] Returns a structured `DedupeReport`: `{ toMerge: MergePair[], toDelete: Memory[], unchanged: number }` — **no file writes**.
- [ ] A `dry_run: boolean` param (default `true`): when `false` and the caller confirms, applies the report via `store.apply()`.
- [ ] A "Prune Memory" button added to the VS Code Kanban board WebView (sidebar footer) that calls the tool with `dry_run: true` and displays the report as a collapsible diff.
- [ ] Tests: empty store returns empty report; two near-identical entries produce one `toMerge` pair; distinct entries are `unchanged`.
- [ ] `pnpm build` and `pnpm test` pass clean.

## Files Likely Affected

- `packages/mcp-server/src/tools/memory-dedupe.ts` (new)
- `packages/mcp-server/src/index.ts` (register tool)
- `packages/vscode-extension/src/board-provider.ts` (Prune Memory button in sidebar)
- `packages/core/src/__tests__/memory-dedup.test.ts` (extend existing tests)

## Approach

1. Implement tool: load all memories via `store.overview()`, group by category, run
   `deduplicateMemories()` pairwise within each group, aggregate into `DedupeReport`.
2. If `dry_run: false`: call `store.apply()` with the merge/delete decisions.
3. Register in MCP server.
4. Add "Prune Memory" button to the board WebView — sends `postMessage` to extension host,
   which calls the MCP tool and posts result back to the WebView for rendering.
5. Extend dedup tests to cover the pairwise full-store scenario.

## Open Questions

- Should the VS Code panel show the raw JSON diff or a rendered Markdown table of proposed changes? (Prefer rendered table — easier for the human reviewer.)

## Notes

Repurposed from original scope of "Automated Memory Pruning & Garbage Collection".
Automation removed — on-demand + human-in-the-loop is sufficient for v1.

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
