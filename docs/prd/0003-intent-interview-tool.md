# PRD-0003: Intent Interview Tool

> Status: draft
> Owner: dila
> Created: 2026-04-28

## Problem

Agents jump straight to writing code without clarifying intent, scope, edge cases, or non-goals. This leads to wasted effort building the wrong thing. Inspired by OMX's `$deep-interview`, we need a structured MCP tool that guides intent clarification before any implementation begins, then auto-generates a PRD draft from the interview results.

## Users

- AI agents (Codex, Claude, Cursor, Aider, Antigravity) working on feature tasks
- Developers using agent-assisted workflows who want better scoping

## User Stories

- As a **developer**, I want to **run an intent interview before coding**, so that **the agent understands exactly what I need before writing a single line**.
- As an **agent**, I want to **receive structured interview output**, so that **I can generate accurate PRDs and tasks automatically**.

## Acceptance Criteria

- [ ] New MCP tool `intent_interview` that accepts a rough description and returns a structured questionnaire
- [ ] Questionnaire covers: goal, non-goals, edge cases, constraints, success criteria, and suggested approach
- [ ] Output JSON can be piped directly into `prd_create` to auto-fill a PRD
- [ ] Interview template lives in `.agents/templates/interview.md` (customizable per project)
- [ ] Tool is registered in `packages/mcp-server/src/tools/`
- [ ] At least one test validates the interview → PRD pipeline

## Out of Scope

- LLM-powered question generation (agent calling the tool does the reasoning)
- Voice or interactive UI (text-only via MCP)

## Open Questions

- Should the interview be a single tool call or multi-turn (tool returns questions, agent fills answers, tool returns PRD)?
- How many questions is the sweet spot? OMX uses 5-7.

## References

- Inspired by: Oh My Codex `$deep-interview` workflow
- Related ADRs: (none yet)

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-{id}-intent-interview-tool.md`
