# Task 0006: Memory Monitor in Kanban — Tier Loaded + Token Delta

> PRD: `(none)`
> Created: 2026-04-27
> Depends on: Task 0005 (`session-tracker.ts` singleton + `memory_read` tool)

## Goal

Add a **Memory Monitor** panel to the VS Code Kanban board sidebar that shows developers,
in real time, which memory tier was loaded for each agent request and the token delta
compared to a hypothetical naive full-file load — making the L0/L1/L2 savings visible.

## Background

Task 0005 implements `session-tracker.ts`: a singleton `Map<filePath, {tokenCount, loadedAt}>`
that is updated whenever `agent-kanban_memory_read` (L2) is called. For L0/L1 calls, the
tracker records only the abstract token count. This task reads from that tracker and
renders it in the VS Code WebView.

**Why this matters:** the token efficiency gain from tiered loading is invisible without a
dashboard. If developers can't see it, they can't trust it and won't adopt the workflow.

## Acceptance Criteria

- [ ] A collapsible "Memory Monitor" section appears in the Kanban board WebView sidebar (below the Kanban columns).
- [ ] Section renders a table: `File | Tier loaded | Tokens used | Tokens saved vs. naive`.
  - "Tier loaded" values: `L0 (abstract)`, `L1 (index)`, `L2 (full)`.
  - "Tokens saved" = `full_token_count − tokens_used` (sourced from `memory_files.token_count`).
- [ ] Section shows a **session total** line: `X files | Y tokens used | Z tokens saved`.
- [ ] A "Clear Session" button resets the `session-tracker` singleton and re-renders the table empty.
- [ ] The panel updates **without** a full WebView reload (uses `postMessage` from extension host).
- [ ] Token estimate uses `Math.ceil(charCount / 4)` — no external dependency.
- [ ] No external services; all data from local MCP server session tracker.
- [ ] `pnpm build` passes clean (no TypeScript errors in extension package).

## Files Likely Affected

- `packages/vscode-extension/src/board-provider.ts` (add Memory Monitor section to WebView HTML; handle `clearSession` message)
- `packages/vscode-extension/src/memory-monitor.ts` (new — polls session-tracker via MCP tool call, fires `postMessage` to WebView)
- `packages/mcp-server/src/tools/session-tracker.ts` (from Task 0005 — add `getSnapshot()` export)
- `packages/mcp-server/src/tools/memory-session.ts` (new thin MCP tool wrapping `getSnapshot()`)
- `packages/mcp-server/src/index.ts` (register `memory-session` tool)

## Approach

1. Add `getSnapshot(): SessionEntry[]` to `session-tracker.ts` (Task 0005 artifact).
2. Implement `memory-session` MCP tool: returns `getSnapshot()` as JSON.
3. Implement `memory-monitor.ts` in the VS Code extension: on a 5-second poll (or on
   `onDidChangeActiveTextEditor`), call `memory-session` via the MCP client, compare with
   last snapshot, and `postMessage` delta to the WebView if changed.
4. In `board-provider.ts`, add the Memory Monitor HTML section and a `message` handler for
   `clearSession` (calls the MCP tool to reset the tracker, then re-polls).
5. Style the table to match the existing Kanban card aesthetic (dark theme, subtle borders).

## Open Questions

- Poll interval vs. push: 5-second poll is simple; a push model via MCP notifications is
  cleaner but requires the MCP SDK's notification support — check before committing.

## Notes

Token estimate formula: `Math.ceil(charCount / 4)` — consistent with OpenAI's rough rule.
Full token count for L2 comparison stored in `memory_files.token_count` at write time.

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
