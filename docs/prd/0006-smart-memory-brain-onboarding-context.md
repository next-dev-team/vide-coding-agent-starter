# PRD-0006: Smart Memory Brain Onboarding Context

> Status: draft
> Owner: Agent
> Created: 2026-04-28

## Problem

Currently, new AI agents or human developers starting a task lack holistic project context. While the memory engine stores learnings, agents must manually query them. We need a 'smart memory brain' that automatically synthesizes project knowledge so new tasks or developers have 'human-like' holistic context immediately without manual discovery.

## Users

- AI Agents (e.g. Claude Code, Cursor) starting a new workspace session.
- Human developers onboarding to the project.

## User Stories

- As an **AI Agent**, I want to **automatically read a unified project brain document on startup**, so that **I immediately understand the tech stack, architecture, and workflow conventions without having to manually query the memory tools**.
- As a **developer**, I want to **run a command to generate a human-readable synthesis of all project memories**, so that **I can quickly onboard and grasp the holistic project context**.

## Acceptance Criteria

- [ ] A new MCP tool `agent-kanban_memory_brain_sync` that reads all L0 abstracts from the memory engine (via `IMemoryBackend`) and generates a structured `docs/PROJECT_BRAIN.md` file.
- [ ] The `PROJECT_BRAIN.md` is organized by memory category (Tech Stack, Architecture, Workflow, Code Style, etc.) and presents a highly readable, human-like digest of the project state.
- [ ] The existing `agent-kanban_agents_generate` tool is updated to automatically link to `docs/PROJECT_BRAIN.md` inside `AGENTS.md` (or run the sync as part of its generation).
- [ ] New task templates or workflows point agents to read `PROJECT_BRAIN.md` as their first step if they need holistic context.
- [ ] File generation uses token-efficient summaries, relying on the `l0_abstract` fields from the memory engine.

## Out of Scope

- Vector search or LLM-based narrative generation (keep it simple, concatenating/formatting existing L0 abstracts).
- Automated background sync (sync will be triggered via MCP tool or alongside `agents_generate`).

## Open Questions

- Should `PROJECT_BRAIN.md` live in `.agents/` or `docs/`? (Preference: `docs/PROJECT_BRAIN.md` so human developers can read it easily).

## References

- Linked tasks: `docs/tasks/todo-0006-...`
- Related ADRs: (none yet)

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-0006-...`
