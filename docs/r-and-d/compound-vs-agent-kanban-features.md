# Compound Engineering vs Agent Kanban: Comprehensive Feature R&D Comparison

This document provides a detailed breakdown of the exact features, slash commands, and agent architectures used in the "Compound Engineering" methodology (developed by Every Inc.) and maps them to our current and planned capabilities in **Agent Kanban**.

## The Core Command Interfaces

Compound relies heavily on proprietary CLI slash commands to trigger orchestrations. Agent Kanban aims to build these triggers natively into the VS Code UI.

| Compound Feature | Description | Agent Kanban Equivalent / Roadmap |
| :--- | :--- | :--- |
| `/lfg` (End-to-End) | Executes the entire loop (Plan → Work → Review → Compound) in one command, pausing only for plan approval. | **Roadmap:** A "Start Feature Loop" button on the Kanban board that orchestrates the entire lifecycle automatically. |
| `/workflows:plan` | Agents research and synthesize detailed implementation plans. | **Current:** Triggered manually via `PRD` and `Task` Markdown files (`.agents/templates/`). |
| `/workflows:work` | A 4-step execution phase: 1. Creates a git worktree. 2. Writes code. 3. Runs parallel reviewers. 4. Runs linters and creates a PR. | **Current:** Generalist IDE agent acts on `todo-` task files. <br>**Roadmap:** Add Kanban button to automate branching and task execution. |
| `/workflows:compound` | Spawns sub-agents (Context Analyzer, Solution Extractor) to analyze transcripts, extract insights, and create searchable documentation to prevent future bugs. | **Roadmap (Task `0002`):** Implement the `agent-kanban_compound_learnings` MCP tool to automate knowledge extraction into `.agents/skills/`. |
| `/triage` | Presents findings (from bugs or reviews) one-by-one for human decision (approve, skip, customize). | **Current:** Kanban board `blocked-` columns and IDE chat history. |

## The "27 Specialized Agents" vs MCP Resources

Compound boasts an orchestration system that can spawn up to 27+ specialized agents. Managing dozens of distinct agent binaries is complex. **Agent Kanban's philosophy is to use ONE powerful IDE agent (like Claude Code) and inject specialized personas via MCP resources.**

Here is how the most critical Compound agents map to our architecture:

| Compound Specialized Agent | Agent Kanban Equivalent (via MCP Resources & Skills) |
| :--- | :--- |
| **Security Sentinel** | MCP Resource: `agent-kanban://review/security` (Provides OWASP checklists and repo-specific security rules). |
| **Performance Specialist** | MCP Resource: `agent-kanban://review/performance` (Provides performance benchmarks and N+1 query checks). |
| **Framework Docs Expert** | Existing context tools: Our MCP server can connect to the `context7` MCP server to fetch real-time framework docs. |
| **Database Migration Specialist** | MCP Resource: `agent-kanban://review/database` (Checks for zero-downtime migration rules). |
| **Context Analyzer** | MCP Tool: `agent-kanban_compound_learnings` (Reads the codebase and task diff to find the root cause). |
| **Solution Extractor** | MCP Tool: `agent-kanban_compound_learnings` (Distills the root cause into a 1-sentence rule). |
| **Prevention Strategist** | Built into our `.agents/workflows/feature-loop.md` to ensure rules are applied during the `Plan` phase. |
| **Code Reviewers (React, Ruby, etc.)**| Individual `.agents/skills/` files (e.g., `react-guidelines.md`) loaded dynamically. |

## Memory & State Architecture

| Feature | Compound Engineering | Agent Kanban (Our Platform) | Gap / Difference |
| :--- | :--- | :--- | :--- |
| **Procedural Memory (Skills)** | Sharded into dozens of tiny Markdown files for 27 specialized agents. | **Identical concept:** Sharded into `.agents/skills/` (e.g., `task-writing.md`). | None in architecture, but Agent Kanban relies on a generalist IDE agent to read them. |
| **Global Rules** | Maintained in a central `MEMORY.md` file. | **Identical concept:** Maintained in our `AGENTS.md` file in the project root. | None. |
| **Episodic Memory (History)** | Past tasks and PRDs stored in text files, often indexed with a Vector DB (RAG) for semantic search. | **Similar:** Stored in `docs/tasks/` and `docs/decisions/` (ADRs). | We rely on the IDE agent's workspace search (`grep_search`) instead of a dedicated Vector DB. |
| **Memory Creation (Writing)** | **Automated:** `/compound` command triggers an agent to summarize the chat transcript and append a one-liner rule to memory. | **Manual (Currently):** The agent or developer must manually decide to use tool calls to update `AGENTS.md` or create a new skill. | *(Task `todo-0002` aims to automate this via a new MCP tool!)* |
| **Context Loading (Reading)** | **Automated & Specialized:** The system routes tasks to a specific agent (e.g., "Reviewer Agent") which *only* loads the relevant guidelines. | **Generalist:** We use one general IDE agent. The user must manually `@mention` the relevant skill file, or the agent must proactively find it. | Agent Kanban is less prescriptive about routing; relies heavily on the underlying IDE agent's capabilities. |
| **Memory Refactoring (Pruning)** | **Automated:** "Garbage Collector" agents periodically read bloated memory files, delete outdated rules, and split them up. | **Manual:** The human developer has to notice `AGENTS.md` is too long and ask the AI to refactor it. | Agent Kanban lacks automated background maintenance. |
| **Artifact State Tracking** | Hidden database tracking the status of features and agent work. | The file system is the absolute truth (`todo-*.md` → `wip-*.md` → `done-*.md`). | Agent Kanban's file structure is superior because it is completely portable. |

## Key R&D Takeaways

1. **Automation over Manual Files:** Agent Kanban's file structure is superior because it is completely portable (Markdown vs Hidden Databases). However, Compound's **Slash Commands** provide a much faster UX. We must prioritize building UI buttons in the VS Code Kanban board that act as visual slash commands to automate these workflows.
2. **The "Compound" Tool is Critical:** The biggest missing piece in Agent Kanban is the `/workflows:compound` functionality. Automating the extraction of bug fixes and architectural rules into `AGENTS.md` is our highest priority (Task `0002`).
3. **Worktrees & PRs:** Implementing automated git worktree generation and PR creation (like Compound's `/workflows:work`) would be a massive efficiency boost for Agent Kanban in the future.

## OpenViking Memory Architecture — Concepts Adopted, Code Not Adopted

**Decision (see [ADR 0004](../decisions/0004-memory-backend-decision.md)):**
OpenViking (AGPLv3) is the reference design. We adopt its architecture concepts in full but
build a TypeScript-native implementation under MIT. OpenViking's code is not used.

### Feature Parity Table

| Capability | OpenViking | Agent Kanban |
| --- | --- | --- |
| L0/L1/L2 tiered loading | ✅ | ✅ Tasks 0002 + 0005 |
| 8 memory categories | ✅ | ✅ Same taxonomy |
| Auto-extraction with dedup (skip/create/merge/delete) | ✅ | ✅ Task 0002 |
| Hybrid search — FTS5 (text) | ✅ | ✅ v1, Task 0005 |
| Hybrid search — vector (sqlite-vec) | ✅ | ⏳ v2, deferred |
| Hierarchical recursive retrieval w/ score propagation | ✅ | ⚠ Simplified: single-level (category → file) |
| Two-stage rerank (Volcengine doubao-rerank) | ✅ | ❌ Skipped — marginal win, proprietary API |
| Intent analysis (0–5 typed queries) | ✅ | ⚠ Simplified — single query + optional category filter |
| AST code skeleton mode | ✅ | ❌ Deferred to v3 |
| Multimodal (PDF / video / audio) | ✅ | ❌ Out of scope |
| License | AGPLv3 | MIT |

We match OpenViking on every feature that drives the token savings. We skip the features
that drive its bulk and license complexity.

### L0/L1/L2 Tier Discipline (enforced at MCP tool boundary)

| Tier | What it contains | How to load |
| --- | --- | --- |
| **L0 (Abstract)** | 1-sentence `description:` per memory entry | Returned automatically by `memory_find` and `memory_overview` |
| **L1 (Index)** | Full index of all L0 abstracts, grouped by category | Call `memory_overview` |
| **L2 (Detail)** | Full file content | Call `memory_read` with explicit file path — only when needed |

**Mandatory rule:** `memory_find` and `memory_overview` MUST NOT return L2 content.
`memory_read` is the only exit point for full content, and it logs to the session tracker.

### Local-First, No External Services

- **Storage:** SQLite (`better-sqlite3`, already in dep graph) + FTS5 built-in.
- **No cloud, no embeddings in v1.** Semantic search deferred to v2 via `sqlite-vec`.
- **Git as sync.** The SQLite db lives in `.agent-kanban/` (gitignored). The Markdown
  source files in `.agents/skills/` and `docs/tasks/` remain the human-readable truth.

### VS Code Memory Monitor (Task 0006)

The Kanban board sidebar will show a **Memory Monitor** panel displaying:
- Per-file table: which tier was loaded, tokens used, tokens saved vs. naive full-file load.
- Session totals.
- "Clear Session" button.

Data flows from the MCP server's `session-tracker.ts` singleton → `memory-session` MCP
tool → VS Code extension poll → WebView `postMessage`. No external dependencies.

