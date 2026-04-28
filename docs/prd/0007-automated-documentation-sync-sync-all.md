# PRD-0007: Automated Documentation Sync (Sync All)

> Status: draft
> Owner: Agent
> Created: 2026-04-28

## Problem

Most documentation (PRDs, Tasks, Decisions) goes out of sync with the codebase because code naturally evolves, branches off, and changes during implementation. The lack of a 'sync all' feature means the AI context slowly drifts from reality, leading to hallucinations or incorrect AI instructions.

## Users

- **Developers / AI Agents:** Need accurate, up-to-date context from PRDs and Tasks to successfully implement new features without conflicting with undocumented codebase changes.

## User Stories

- As an **AI Agent**, I want to **run a sync tool against a document**, so that **I can reconcile the documented requirements with the current state of the codebase**.
- As a **developer**, I want to **click a 'Sync Docs' button in the VS Code Kanban extension**, so that **my project documentation automatically reflects recent code changes**.

## Acceptance Criteria

- [ ] Create a new MCP tool `mcp_agent-kanban_docs_sync` in `packages/mcp-server/src/tools/docs-sync.ts`.
- [ ] The tool should accept a `target` (specific file path or 'all').
- [ ] The tool must read the target document, parse its intent, and return a comparison against the codebase (using `scanProjectContext` or similar utilities) to detect discrepancies.
- [ ] The tool should optionally apply changes directly to the markdown file to rewrite outdated implementation details or check off completed criteria.
- [ ] Register the new tool in `packages/mcp-server/src/index.ts`.
- [ ] Add a "Sync Docs" action button to the VS Code Extension (`agent-kanban-vscode`) Kanban board UI that invokes the MCP tool.

## Out of Scope

- Synchronizing purely subjective or high-level product goals. The sync should focus on technical implementation details, file structures, and completion of acceptance criteria.
- Deleting documents entirely.

## Open Questions

- Should the sync tool overwrite the markdown directly, or generate a "Diff Report" that the agent decides to apply? (Decision: Overwrite directly if explicitly requested by the agent/user, otherwise generate a report).

## References

- Linked tasks: `docs/tasks/todo-0007-implement-docs-sync.md`
- Related ADRs: (none yet)

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-0007-implement-docs-sync.md`
