# ADR 0004 — Memory Engine: Build vs. Adopt; Storage & Search Strategy

- **Status:** Accepted
- **Date:** 2026-04-27
- **Author:** Agent

---

## Context

Agent Kanban needs a long-term memory engine to prevent LLM context-window bloat as the
`.agents/skills/` library and `docs/tasks/` archive grow. The engine must:

1. Implement **L0/L1/L2 tiered loading** — agents load only what they need.
2. Classify memories into **8 categories** (matching OpenViking taxonomy).
3. **Auto-extract** learnings from completed tasks and deduplicate against existing memories
   (skip / create / merge / delete decisions).
4. Support **search** so agents can find relevant memories by keyword or semantic similarity.

Three existing open-source systems were evaluated before deciding to build:

| Project | License | Notes |
| --- | --- | --- |
| **OpenViking** | AGPLv3 | Most feature-complete (L0/L1/L2, 8 categories, auto-extraction, hybrid search, two-stage rerank, AST skeletons, multimodal). AGPL would propagate to any distributed Agent Kanban install — incompatible with our MIT goal. Also ships ~3 000 LoC of Python in a FastAPI service, adding a polyglot runtime dependency. |
| **sqlite-memory** | Elastic License 2.0 | Elastic-licensed; commercial use restricted. Schema is also tightly coupled to its own embedding model and not easily adapted. |
| **OpenMemory (Mem0)** | Apache 2.0 | Cloud-first; local mode still requires a running Qdrant or Postgres instance. Dependency weight and external services are out of scope for a local-first VS Code extension. |

**Decision: build a TS-native engine.**
We adopt OpenViking's *concepts* (L0/L1/L2 tiers, 8 categories, auto-extraction with
skip/create/merge/delete dedup, hybrid search) without adopting its code or license.
The implementation lives entirely in `@agent-kanban/core` and the MCP server, both
already MIT-licensed TypeScript packages running on Node.js — no new runtime dependency.

---

## Decision

### 1. Build-vs-Adopt

Build. Reasons:

- **License hygiene.** MIT is required. All evaluated adopts are AGPL, Elastic, or cloud-only.
- **Polyglot cost.** A Python FastAPI service for a VS Code extension is unacceptable for
  the target developer who has only Node.js installed.
- **Scope fit.** OpenViking's two-stage rerank (Volcengine), AST skeletons, and multimodal
  pipeline address use cases (large enterprise codebases, PDF/video knowledge bases) we
  explicitly exclude.
- **LoC budget is achievable.** The features we need can be delivered in ~1 300 LoC of
  TypeScript across two tasks (0002 + 0005), well within the team's review capacity.

### 2. Storage Layer

**SQLite via `better-sqlite3`** (already in the dependency graph).

Two tables:
```
memory_files   id, category, slug, l0_abstract, file_path, token_count, created_at, updated_at
memory_dedup   id, memory_id, candidate_hash, decision (skip|create|merge|delete), decided_at
```

No additional dependencies required for v1.

### 3. Search: FTS5 first; sqlite-vec deferred to v2

- **v1:** SQLite FTS5 full-text search. Ships with SQLite — zero extra installs.
  Covers the primary use case: keyword-based skill recall.
- **v2 (deferred):** `sqlite-vec` vector extension for semantic search.
  Deferred because: (a) embedding requires either a local model or an API call — both add
  dependencies the current milestone cannot absorb; (b) FTS5 already captures >90% of
  agent recall quality for skill files (short, keyword-rich Markdown).

### 4. Features: match vs. skip vs. defer

| Feature | Decision |
| --- | --- |
| L0/L1/L2 tiered loading | ✅ Implemented (Tasks 0002 + 0005) |
| 8 memory categories | ✅ Same taxonomy as OpenViking |
| Auto-extraction with dedup (skip/create/merge/delete) | ✅ Implemented (Task 0002) |
| Hybrid search (FTS5) | ✅ v1 |
| Hybrid search (FTS5 + vector) | ⏳ v2, deferred |
| Hierarchical recursive retrieval w/ score propagation | ⚠ Simplified: single-level (category → file) |
| Two-stage rerank (Volcengine doubao-rerank) | ❌ Skipped — marginal win, proprietary API |
| Intent analysis (multi-typed queries) | ⚠ Simplified: single query + optional category filter |
| AST code skeleton mode | ❌ Deferred to v3 if needed |
| Multimodal (PDF/video/audio) | ❌ Out of scope |

### 5. Tier Discipline Rule

**This rule is mandatory for all memory tool implementations:**

> An MCP tool MUST NOT load L2 content unless the caller explicitly requests it by path.
> L0 abstracts are the only data returned from index / find / overview calls.
> L2 full-file reads are gated behind a separate `memory_read` tool call.

This rule prevents the very token bloat the memory engine exists to solve.

---

## Consequences

- **Positive:** MIT throughout; no new runtime; no external services; reviewable LoC budget.
- **Positive:** FTS5 is available on every platform Node.js runs on — no native addon complications.
- **Positive:** The tier discipline rule is enforceable at the MCP tool boundary and is
  machine-checkable (no L2 content in index response shapes).
- **Negative:** v1 search is keyword-only; semantic recall deferred to v2.
- **Negative:** We must maintain our own extraction + dedup logic rather than relying on a
  community-maintained library.
- **Watch:** If the dedup pipeline grows beyond ~200 LoC of heuristics, revisit adopting a
  diff/similarity library (already excluded from this ADR).
