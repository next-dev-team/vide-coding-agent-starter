# Task 0010: Memory Backend — File Mode (`docs/memory/`)

> PRD: `(none)`
> Created: 2026-04-27
> ADR: `docs/decisions/0004-memory-backend-decision.md`
> Depends on: Task 0002 types (`DedupResult`, `Memory`, `MemoryCandidate`)

## Goal

Add a configurable file-mode memory backend so users can store memories as plain
Markdown files in `docs/memory/` instead of (or alongside) the SQLite DB — no database
required.

## Background

The SQLite backend (Task 0005) is fast and searchable, but:
- Requires `better-sqlite3` (a native Node addon — may not build on all envs).
- The `.db` file is binary and not human-readable; memory contents are invisible in GitHub
  diffs and PR reviews.
- Some teams prefer "everything in git, readable in VS Code".

**File mode** stores each memory as a standalone Markdown file:

```
docs/memory/
  architecture/
    use-pnpm-workspaces-for-isolation.md
    tiered-l0-l1-l2-memory-discipline.md
  bugs/
    memory-read-must-not-return-l2-in-overview.md
  workflow/
    always-run-pnpm-build-before-done.md
  ...
```

Each file has a YAML frontmatter header:

```markdown
---
id: 3
category: architecture
slug: use-pnpm-workspaces-for-isolation
abstract: "Use pnpm workspaces to keep packages isolated and avoid hoisting bugs."
token_count: 48
created_at: 2026-04-27T00:00:00.000Z
updated_at: 2026-04-27T00:00:00.000Z
---

Full detail about why pnpm workspaces are used, what problems hoisting caused,
and how to configure the workspace protocol correctly.
```

L0 (`abstract:`) is read from frontmatter only — the file body is never loaded by
`overview()` or `find()`. The body is the L2 detail returned only by `memory_read`.

**Configuration** lives in `.agent-kanban/config.json`:
```json
{ "memory": { "backend": "files" } }
```
Default when the file is absent: `"sqlite"` (preserves current behaviour exactly).

## Acceptance Criteria

- [ ] A config key `memory.backend` is read from `.agent-kanban/config.json` (created on first use). Valid values: `"sqlite"` (default) and `"files"`.
- [ ] New module `packages/core/src/memory/backend.ts` defines `IMemoryBackend` interface with methods: `apply()`, `find()`, `overview()`, `read()`, `getById()`, `close()`.
- [ ] `MemoryStore` (SQLite) and new `MemoryFileBackend` both implement `IMemoryBackend`.
- [ ] New `packages/core/src/memory/config.ts` exports `loadMemoryConfig(projectPath)` → `{ backend: 'sqlite' | 'files' }` and `saveMemoryConfig(projectPath, config)`.
- [ ] New `packages/core/src/memory/file-backend.ts` — `MemoryFileBackend` class:
  - `apply(results, fileDir?)` — writes/merges/deletes `.md` files in `docs/memory/<category>/`.
  - `overview(category?)` — scans frontmatter only, returns `Memory[]` (L0 fields, no body).
  - `find(query, category?, limit?)` — keyword scan on `abstract` field (simple `includes`, case-insensitive). No FTS5.
  - `read(filePathOrId)` — returns full file body (L2).
  - `getById(id)` — reads the frontmatter `id` field to find the right file.
- [ ] New factory function `createMemoryBackend(projectPath): IMemoryBackend` in `packages/core/src/memory/index.ts` — reads config, returns the right backend.
- [ ] All MCP memory tools updated to call `createMemoryBackend(projectPath)` instead of `new MemoryStore(dbPath)` — zero other changes needed.
- [ ] New MCP tool `memory_config_set` in `packages/mcp-server/src/tools/memory-config.ts`: accepts `{ backend: 'sqlite' | 'files' }`, writes config, returns `{ set: true, backend }`.
- [ ] `docs/memory/` added to `.gitignore` only for `*.db` — Markdown files should be committed.
- [ ] `AGENTS.md` updated: one paragraph "Choosing a memory backend" explaining the trade-offs.
- [ ] Unit tests: `MemoryFileBackend` `apply` creates files; `overview` returns L0 only; `find` keyword matches abstract; `read` returns body; dedup deletes file.
- [ ] `pnpm build` and `pnpm test` pass clean.

## Files Likely Affected

- `packages/core/src/memory/backend.ts` (new — `IMemoryBackend` interface)
- `packages/core/src/memory/config.ts` (new — load/save `.agent-kanban/config.json`)
- `packages/core/src/memory/file-backend.ts` (new — `MemoryFileBackend`)
- `packages/core/src/memory/store.ts` (implement `IMemoryBackend`)
- `packages/core/src/memory/index.ts` (add `createMemoryBackend` factory)
- `packages/core/src/index.ts` (export `IMemoryBackend`, `createMemoryBackend`)
- `packages/mcp-server/src/tools/memory-tools.ts` (use `createMemoryBackend` instead of `new MemoryStore`)
- `packages/mcp-server/src/tools/compound-learnings.ts` (same)
- `packages/mcp-server/src/tools/memory-dedupe.ts` (same)
- `packages/mcp-server/src/tools/memory-config.ts` (new tool)
- `packages/mcp-server/src/tools/index.ts` (register `memory_config_set`)
- `AGENTS.md`
- `.gitignore` (protect `*.db` inside `docs/memory/` if it ever lands there)
- `packages/core/src/__tests__/memory-file-backend.test.ts` (new)

## Approach

1. Define `IMemoryBackend` interface in `backend.ts` — mirrors the existing `MemoryStore`
   public surface exactly.
2. Add `implements IMemoryBackend` to `MemoryStore`.
3. Implement `MemoryFileBackend`:
   - Use `gray-matter` (already widely used in Node tooling) for frontmatter parse/write.
   - **OR** write a tiny inline YAML frontmatter parser (avoids a new dep — ~40 LoC).
     Lean toward inline unless `gray-matter` is already in the dep graph.
   - `find()` walks `docs/memory/**/*.md`, reads frontmatter, filters by `abstract.includes(query)`.
   - `apply()` computes the slug from `candidate.l0_abstract`, writes `docs/memory/<category>/<slug>.md`.
   - Numeric IDs in file mode: read all files, build an in-memory `id` map from frontmatter.
4. Implement `loadMemoryConfig` / `saveMemoryConfig` using `JSON.parse` / `JSON.stringify`.
5. Add `createMemoryBackend(projectPath)` factory that reads config and returns the right backend.
6. Thread `createMemoryBackend` through all MCP tools (3 files, ~1 line change each).
7. Add `memory_config_set` MCP tool.
8. Write tests using a `tmp` directory (use `os.tmpdir()` + a unique subfolder, clean up in `afterEach`).
9. Update `AGENTS.md`.

## Open Questions

- **Inline frontmatter vs. `gray-matter`**: `gray-matter` is 0-dependency and tiny; prefer it if acceptable as a new dep. Otherwise write inline parser. Check AGENTS.md rule before adding.
- **ID sequence in file mode**: Files don't have an auto-increment DB. Options: (a) use a `next_id.json` counter file in `.agent-kanban/`; (b) hash-based ID from slug; (c) no numeric ID, use slug as the stable key. Lean toward (c) — slug is already unique per category.
- **`docs/memory/` in git**: Should the task write a `.gitkeep` to ensure the dir is committed even when empty?

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
