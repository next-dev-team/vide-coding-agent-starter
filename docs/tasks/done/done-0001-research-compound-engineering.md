# Task 0001: Research Compound Engineering

> PRD: (none)
> Created: 2026-04-26

## Goal

Conduct a timeboxed research spike to analyze the "Compound Engineering" methodology and compare it with Agent Kanban to identify features that can make our platform more powerful.

## Acceptance Criteria

- [x] Complete a 60-minute timeboxed analysis of the competitor's 4-step loop (Plan → Work → Review → Compound).
- [x] Document a comparison matrix of the competitor's 27 specialized agents and 23 slash commands against Agent Kanban's current capabilities.
- [x] Draft an ADR (in `docs/decisions/`) proposing at least 3 high-impact architectural additions or workflow improvements derived from the research.
- [x] Create follow-up `todo-` tasks for any approved improvements.
- [x] All tests pass (`pnpm test`)
- [x] Build clean (`pnpm build`)
- [x] Public APIs have JSDoc (`/** ... */`)

## Files Likely Affected

- docs/decisions/000X-compound-engineering-analysis.md — new

## Approach

- Review the provided "Origin Story" and "AI Development Ladder" documents to understand the core philosophy (extracting taste, building safety nets, compounding learnings).
- Map the competitor's core loop (`/plan`, `/work`, `/review`, `/compound`, `/lfg`) to Agent Kanban's existing `.agents/workflows/feature-loop.md`.
- Evaluate the feasibility of adopting a massively parallel multi-agent review system within the Agent Kanban architecture.
- Summarize actionable insights in an ADR, focusing on how Agent Kanban can exceed the competitor's capabilities (e.g., tighter VS Code integration, better visual tools).

## Open Questions

Q1: Should we aim to build a suite of specialized agents (like the competitor's 14 review agents) natively into the Agent Kanban MCP server?
Q2: Is the primary target interface for these new "powerful" features the CLI, the VS Code extension, or both?

## Notes

(empty until implementation)
- Completed research on Compound Engineering. ADR 0003 has been created along with follow-up tasks (0002, 0003, 0004) to implement the Compound MCP Tool, Specialized Review Resources, and Kanban UI Workflow Triggers. All tests and builds pass.

## When Done

- [ ] Rename file from `todo-` to `done-`
- [ ] Ensure the proposed ADR is reviewed by the user.
