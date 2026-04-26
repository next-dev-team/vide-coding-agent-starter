# Task 0005: TS-Native Memory Engine — Storage + L0/L1/L2 + Find/Overview/Read Tools

> PRD: `(none)`
> Created: 2026-04-27
> ADR: `docs/decisions/0004-memory-backend-decision.md`
> Depends on: Task 0002 (types + dedup decisions)

## Goal

Build the storage and retrieval half of the memory engine: persist memories to SQLite
(FTS5), implement the L0/L1/L2 tier discipline, and expose three MCP tools
(`memory_find`, `memory_overview`, `memory_read`) that give the IDE agent structured,
token-efficient access to project memory.

## Background

Task 0002 produces `DedupResult[]`. This task persists those results and makes them
queryable. The tier discipline rule from ADR 0004 is enforced at the tool boundary:

> `memory_find` and `memory_overview` return **L0 abstracts only** (never full content).
> `memory_read` is the only tool that returns L2 full content — and only for a single
> explicitly named file.

Storage: SQLite via `better-sqlite3` (already in dep graph).
Search: SQLite FTS5 (built-in — no native addon, no external service).
Vector search: deferred to v2.

## Acceptance Criteria

- [ ] New module `packages/core/src/memory/store.ts` with a `MemoryStore` class (or factory function) wrapping `better-sqlite3`.
- [ ] `MemoryStore` creates two tables on first open: `memory_files` and `memory_dedup` (schema per ADR 0004).
- [ ] `store.apply(results: DedupResult[])` — persists create/merge/delete decisions; skip decisions are no-ops.
- [ ] `store.find(query: string, category?: MemoryCategory, limit?: number): Memory[]` — FTS5 full-text search returning L0 fields only (`id`, `category`, `slug`, `l0_abstract`, `file_path`, `token_count`). **No `raw_detail` in response.**
- [ ] `store.overview(category?: MemoryCategory): Memory[]` — returns all memories sorted by category + slug; L0 fields only.
- [ ] `store.read(filePathOrId: string): string` — returns full L2 file content for a single memory.
- [ ] MCP tool `agent-kanban_memory_find` — wraps `store.find`. Returns L0 JSON array.
- [ ] MCP tool `agent-kanban_memory_overview` — wraps `store.overview`. Returns L0 JSON array grouped by category.
- [ ] MCP tool `agent-kanban_memory_read` — wraps `store.read`. Returns full content string. Logs to a session tracker (feeds Task 0006 Token Saver UI).
- [ ] `AGENTS.md` updated: add "Memory Tools" section instructing agents to call `memory_overview` or `memory_find` **before** loading any skill file.
- [ ] `.agents/workflows/feature-loop.md` updated: add a "Memory warm-up" step at the start of Plan phase.
- [ ] Unit tests: `store.apply` persists correctly; `store.find` returns no L2 fields; `store.overview` groups by category; `store.read` returns full content.
- [ ] `pnpm build` and `pnpm test` pass clean.

## Files Likely Affected

- `packages/core/src/memory/store.ts` (new)
- `packages/core/src/index.ts` (barrel export)
- `packages/mcp-server/src/tools/memory-find.ts` (new)
- `packages/mcp-server/src/tools/memory-overview.ts` (new)
- `packages/mcp-server/src/tools/memory-read.ts` (new)
- `packages/mcp-server/src/tools/session-tracker.ts` (new — in-memory map: file_path → {token_count, loaded_at})
- `packages/mcp-server/src/index.ts` (register 3 new tools)
- `AGENTS.md`
- `.agents/workflows/feature-loop.md`

## Approach

1. Implement `MemoryStore` using `better-sqlite3` with WAL mode. Create tables + FTS5 virtual table (`memory_fts`) on `l0_abstract` column in the constructor.
2. Implement `apply`: iterate `DedupResult[]`, run `INSERT`, `UPDATE`, or `DELETE` in a single transaction.
3. Implement `find`: run `SELECT m.* FROM memory_fts JOIN memory_files m … WHERE memory_fts MATCH ?` — project only L0 columns.
4. Implement `overview`: `SELECT … FROM memory_files ORDER BY category, slug` — L0 only.
5. Implement `read`: `SELECT file_path FROM memory_files WHERE id = ?` → `fs.readFile`.
6. Implement `session-tracker.ts`: a simple `Map<string, {tokenCount: number, loadedAt: Date}>` exported as a singleton; `memory_read` pushes to it; Task 0006 reads from it.
7. Implement the three MCP tools — thin wrappers, delegate to `MemoryStore`.
8. Register tools in MCP server index.
9. Update `AGENTS.md` and `feature-loop.md`.
10. Write tests.

## Open Questions

- DB file path: `.agent-kanban/memory.db` (gitignored) or `docs/memory/memory.db`? Lean toward `.agent-kanban/` to keep `docs/` human-readable only.

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
