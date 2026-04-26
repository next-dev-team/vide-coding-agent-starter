# Task 0002: TS-Native Memory Engine — Extraction + Dedup Pipeline

> PRD: `(none)`
> Created: 2026-04-27
> ADR: `docs/decisions/0004-memory-backend-decision.md`

## Goal

Build the extraction and deduplication half of the memory engine: read a completed task,
classify the learnings into one of 8 memory categories, compare against existing memories,
and emit a structured skip / create / merge / delete decision — all in TypeScript, no
external services, MIT-licensed.

## Background

OpenViking (AGPLv3) proved the pattern. We adopt its concepts, not its code. The engine
lives in `@agent-kanban/core` (shared logic) and surfaces as an MCP tool in
`packages/mcp-server/`. See ADR 0004 for the build-vs-adopt rationale and storage schema.

**8 memory categories (OpenViking taxonomy):**

| # | Category | What it stores |
|---|----------|---------------|
| 1 | `tech_stack` | Languages, frameworks, build tools in use |
| 2 | `architecture` | Patterns, boundaries, ADRs |
| 3 | `workflow` | Dev process, branching, PR conventions |
| 4 | `code_style` | Naming, formatting, lint rules |
| 5 | `domain` | Business rules, domain model definitions |
| 6 | `bugs` | Known issues, root-causes, workarounds |
| 7 | `performance` | Benchmarks, N+1 patterns, caching rules |
| 8 | `security` | OWASP items, auth rules, secret handling |

**Dedup decision matrix:**

| Situation | Decision |
|-----------|----------|
| Near-identical entry already exists (similarity ≥ 0.85) | `skip` |
| No overlapping entry exists | `create` |
| Overlapping entry exists but new info adds detail | `merge` |
| Existing entry contradicts confirmed new fact | `delete` existing, `create` new |

Similarity for v1: normalised Levenshtein on L0 abstracts (no embedding required).

## Acceptance Criteria

- [ ] New module `packages/core/src/memory/extractor.ts` exported from `@agent-kanban/core`.
- [ ] `extractMemories(taskMarkdown: string): MemoryCandidate[]` — parses a completed task file and returns an array of candidate memories with `category`, `l0_abstract`, and `raw_detail` fields.
- [ ] New module `packages/core/src/memory/dedup.ts`.
- [ ] `deduplicateMemories(candidates: MemoryCandidate[], existing: Memory[]): DedupResult[]` — returns one `{ decision, candidate, matchedId? }` per candidate.
- [ ] Similarity uses normalised Levenshtein on `l0_abstract`; threshold is configurable (default 0.85).
- [ ] New MCP tool `agent-kanban_compound_learnings` in `packages/mcp-server/src/tools/compound-learnings.ts`.
- [ ] Tool accepts `task_id` (string) and optional `project_path`. Returns `DedupResult[]` as JSON — no silent file writes.
- [ ] Unit tests in `packages/core/src/__tests__/memory-extractor.test.ts` and `memory-dedup.test.ts` cover: happy path, skip collision, merge candidate, delete+create case.
- [ ] No `any` types. All new public functions have one-line JSDoc.
- [ ] `pnpm build` and `pnpm test` pass clean.

## Files Likely Affected

- `packages/core/src/memory/extractor.ts` (new)
- `packages/core/src/memory/dedup.ts` (new)
- `packages/core/src/memory/types.ts` (new — `Memory`, `MemoryCandidate`, `DedupResult`)
- `packages/core/src/index.ts` (barrel export additions)
- `packages/mcp-server/src/tools/compound-learnings.ts` (new)
- `packages/mcp-server/src/index.ts` (register new tool)
- `packages/core/src/__tests__/memory-extractor.test.ts` (new)
- `packages/core/src/__tests__/memory-dedup.test.ts` (new)

## Approach

1. Define types in `memory/types.ts`: `Memory`, `MemoryCandidate`, `DedupResult`, `MemoryCategory` (union of 8 strings).
2. Implement `extractor.ts`: use the task's `## Notes` and `## Approach` sections as the extraction source; prompt-style heuristic to classify each bullet into a category.
3. Implement `dedup.ts`: normalised Levenshtein (no dep — implement inline, ~30 LoC). Return structured decisions, never mutate files.
4. Implement MCP tool: call extractor → dedup → return results. The *caller* (agent or Task 0005 storage layer) decides what to write.
5. Wire tool into MCP server index.
6. Write tests.

## Open Questions

- Should extraction use a simple keyword→category lookup table or a small hand-rolled classifier? (Lean toward keyword table first — avoids LLM call inside the tool.)

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
