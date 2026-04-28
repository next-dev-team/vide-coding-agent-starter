# Project Docs

This is where the **why** of the project lives. Code is the *what* and *how*; the markdown here is the *why* and *what for*.

## Layout

| Folder        | Contents                                   | Template                         |
| ------------- | ------------------------------------------ | -------------------------------- |
| `prd/`        | What features do, who they're for          | `.agents/templates/prd.md`       |
| `tasks/`      | Scoped chunks of work to deliver a PRD     | `.agents/templates/task.md`      |
| `decisions/`  | Why we chose pattern/package X over Y      | `.agents/templates/adr.md`       |
| `test-cases/` | What to verify (Jira/Xray-style, TC-IDs)   | `.agents/templates/test-case.md` |

## Naming

All files use **zero-padded sequential numbers**:

- `prd/0002-kanban-mcp-vscode.md`
- `tasks/done-0000-init-monorepo.md`
- `decisions/0001-pnpm-monorepo.md`
- `test-cases/TC-0001-intent-interview-happy-path.md`

Numbers never get reused. If a doc is abandoned, leave the file. Test cases use a `TC-` prefix and are retired by setting `status: deprecated` in frontmatter (see `docs/test-cases/README.md`).

## Task Status (Filename Prefix)

| Prefix     | Meaning            |
| ---------- | ------------------ |
| `todo-`    | Not started        |
| `wip-`     | In progress        |
| `done-`    | Completed          |
| `blocked-` | Blocked — see Notes |

## Current State

- **PRD-0002**: Agent Kanban Platform (monorepo + MCP + CLI + VS Code) — in progress
- **ADR-0001**: pnpm monorepo with TypeScript — accepted
- **ADR-0002**: MCP for agent integration — accepted
- **Task-0000**: Init monorepo — done
