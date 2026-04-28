# AGENTS.md

Instructions for AI coding agents working in this repo.

## Project

**agent-kanban** — Agent-driven Kanban platform: MCP server, CLI, VS Code extension, and starter templates

This is a pnpm monorepo with 4 packages:

- **`create-kanban-app`** (packages/cli) — Scaffold a new project with agent-driven Kanban workflow
- **`@agent-kanban/core`** (packages/core) — Shared logic for parsing, writing, and scanning markdown-based Kanban workflows
- **`@agent-kanban/mcp-server`** (packages/mcp-server) — MCP server for managing markdown-based Kanban workflows
- **`agent-kanban-vscode`** (packages/vscode-extension) — Trello-like Kanban board for markdown-based task management — works with AI agents via MCP

## Project Brain

To get holistic context, conventions, and architectural details about this project, read:
- **[`docs/PROJECT_BRAIN.md`](docs/PROJECT_BRAIN.md)**

It is automatically synthesized from the project's memory engine.

## Tech Stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Language | TypeScript | Type-safe |
| Runtime | Node.js | |
| Package Manager | pnpm | Monorepo with workspaces |
| Build | tsc | |

Do **not** add new packages without asking. Propose with a one-line reason first.

## Commands

| Task | Command |
| ---- | ------- |
| Install deps | `pnpm install` |
| Build | `pnpm build` |
| Dev | `pnpm dev` |
| Test | `pnpm test` |
| Lint | `pnpm lint` |
| Clean | `pnpm clean` |
| Typecheck | `pnpm typecheck` |

Always run `pnpm build` and `pnpm test` before saying a task is done.

## Project Structure

```
todo-flutter-starter/
├── .agents/
│   ├── skills/
│   ├── templates/
│   └── workflows/
├── apps/
├── docs/
│   ├── decisions/
│   ├── prd/
│   ├── r-and-d/
│   ├── tasks/
│   └── README.md
├── packages/
│   ├── cli/
│   ├── core/
│   ├── mcp-server/
│   └── vscode-extension/
├── templates/
│   ├── blank/
│   ├── shared/
│   ├── todo-flutter/
│   └── todo-vite-react/
├── agent-kanban-vscode-0.1.7.vsix
├── agent-kanban-vscode-0.1.8.vsix
├── AGENTS.md
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── tsconfig.json
```

## Coding Conventions

- **File names**: `kebab-case.ts`. Class names: `PascalCase`. Variables: `camelCase`.
- **Imports**: `node:` prefix for builtins. Package imports first, then relative.
- **Type-only imports**: use `import type { ... }` when importing only types.
- **No `any`** — use proper TypeScript types.
- **Functions over classes** when there's no internal state.
- **No `console.log`** in library code — return structured data. OK in CLI/scripts.

## Workflow

When the user gives you a **PRD** or **task file**, follow the loop in `.agents/workflows/feature-loop.md`.

When making a **non-trivial architectural choice**, write an ADR using `.agents/templates/adr.md`.

When the user describes a **new feature in chat without a PRD**, offer to draft one first before writing code.

Task files in `docs/tasks/` use a status prefix in the filename:

| Prefix | Meaning |
| ------ | ------- |
| `todo-` | Not started |
| `wip-` | In progress |
| `done-` | Completed (archived to `docs/tasks/done/`) |
| `blocked-` | Blocked, see Notes section |

Rename the file to update status — don't edit a status field inside.

## What to Ask vs Assume

**Ask the user before:**

- Adding any new dependency
- Changing the monorepo structure
- Deleting files
- Adding external API calls
- Starting a non-trivial task without a PRD

**Assume and proceed when:**

- Creating new modules/functions that follow existing patterns
- Writing tests for new code
- Fixing lint warnings or type errors
- Adding JSDoc comments

## Definition of Done

A task is done when:

1. Code compiles (`pnpm build` clean)
2. Tests pass (`pnpm test`)
3. New behavior has at least one test
4. No new TypeScript errors
5. Public APIs have a one-line JSDoc (`/** ... */`)
6. Task file renamed to `done-*.md`
