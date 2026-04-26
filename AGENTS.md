# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Gemini, Aider, etc.) working in this repo.

## Project

**Agent Kanban** — a pnpm monorepo that ships developer tooling for AI-agent-driven workflows:

- **`@agent-kanban/core`** — shared markdown parser, writer, and scanner
- **`create-kanban-app`** — CLI to scaffold new projects from templates
- **`@agent-kanban/mcp-server`** — MCP server exposing Kanban tools for AI agents
- **`agent-kanban-vscode`** — VS Code extension with Kanban board sidebar

Built as a learning project, so prefer **clarity over cleverness**.

## Tech Stack

| Layer     | Choice                          | Why                                    |
| --------- | ------------------------------- | -------------------------------------- |
| Language  | TypeScript 5+                   | Type safety, ecosystem                 |
| Runtime   | Node.js 20+                     | LTS, native ESM                        |
| Monorepo  | pnpm workspaces                 | Fast, strict, workspace protocol       |
| Build     | tsc (packages), esbuild (vsce)  | Simple, fast                           |
| MCP SDK   | `@modelcontextprotocol/sdk`     | Official MCP implementation            |
| CLI       | prompts + picocolors             | Lightweight, no heavy frameworks       |
| VS Code   | Webview API + esbuild            | Native integration, fast builds        |
| Test      | vitest                          | Fast, ESM-native                       |

Do **not** add new packages without asking. If a task needs one, propose it first with a one-line reason.

## Commands

| Task              | Command                           |
| ----------------- | --------------------------------- |
| Install deps      | `pnpm install`                    |
| Build all         | `pnpm build`                      |
| Build one package | `pnpm --filter @agent-kanban/core build` |
| Run tests         | `pnpm test`                       |
| Type-check        | `pnpm typecheck`                  |
| Clean             | `pnpm clean`                      |
| Test CLI locally  | `node packages/cli/dist/index.js --list` |
| Test MCP locally  | `echo '...' \| node packages/mcp-server/dist/index.js` |

Always run `pnpm build` and `pnpm test` before saying a task is done.

## Project Structure

```
agent-kanban/
├── packages/
│   ├── core/                  # Shared types, parser, writer, scanner
│   │   └── src/
│   │       ├── types.ts       # Task, PRD, ADR, Board types
│   │       ├── parser.ts      # markdown → structured data
│   │       ├── writer.ts      # structured data → markdown
│   │       ├── scanner.ts     # scan docs/, build board, move tasks
│   │       └── index.ts       # barrel export
│   ├── cli/                   # create-kanban-app CLI
│   │   └── src/index.ts       # init, --list, doctor commands
│   ├── mcp-server/            # MCP server (stdio transport)
│   │   └── src/
│   │       ├── index.ts       # server entry
│   │       ├── tools/         # 9 MCP tools
│   │       └── resources/     # 4 MCP resources
│   └── vscode-extension/      # VS Code extension
│       └── src/
│           ├── extension.ts   # activation, commands, file watcher
│           ├── board-provider.ts  # Kanban webview
│           └── status-bar.ts  # task count status bar
├── templates/                 # Starter templates (copied by CLI)
│   ├── shared/                # Common .agents/ + docs/ (all templates get this)
│   ├── todo-vite-react/       # Working React todo app
│   ├── todo-flutter/          # Flutter placeholder
│   └── blank/                 # Docs-only scaffold
├── docs/                      # PRDs, tasks, ADRs for THIS repo
│   ├── prd/
│   ├── tasks/
│   └── decisions/
├── .agents/                   # Agent playbook for THIS repo
│   ├── skills/
│   ├── templates/
│   └── workflows/
└── AGENTS.md                  # ← you are here
```

Each package is independently buildable. Core is a dependency of cli, mcp-server, and vscode-extension.

## Coding Conventions

- **File names**: `kebab-case.ts`. Class names: `PascalCase`. Variables: `camelCase`.
- **Imports**: `node:` prefix for builtins. Package imports first, then relative.
- **Type-only imports**: use `import type { ... }` when importing only types.
- **ESM**: all packages use `"type": "module"` with `.js` extensions in imports.
- **No `console.log`** in library code — return structured data. OK in CLI.
- **Functions over classes** when there's no internal state.
- **No `any`** — use proper TypeScript types.
- **No business logic in CLI/extension** — push to `@agent-kanban/core`.

## Workflow

When the user gives you a **PRD** or **task file**, follow the loop in `.agents/workflows/feature-loop.md`.

When making a **non-trivial architectural choice** (new pattern, new package, schema change), write an ADR using `.agents/templates/adr.md`.

When the user describes a **new feature in chat without a PRD**, offer to draft one first using `.agents/templates/prd.md` before writing any code.

Task files in `docs/tasks/` use a status prefix in the filename:

| Prefix     | Meaning                    |
| ---------- | -------------------------- |
| `todo-`    | Not started                |
| `wip-`     | In progress                |
| `done-`    | Completed                  |
| `blocked-` | Blocked, see Notes section |

Rename the file to update status — don't edit a status field inside.

## What to Ask vs Assume

**Ask the user before:**

- Adding any new package to any workspace
- Changing the monorepo structure
- Modifying `pnpm-workspace.yaml`
- Deleting files
- Adding external API calls
- Starting a non-trivial task without a PRD

**Assume and proceed when:**

- Creating new modules/functions that follow existing patterns
- Writing tests for new code
- Fixing lint warnings or type errors
- Adding obvious JSDoc comments
- Renaming a task file to update its status

## Skills & References

| Task involves...                               | Read                                 |
| ---------------------------------------------- | ------------------------------------ |
| Working from a PRD or task                     | `.agents/workflows/feature-loop.md`  |
| Writing a task (for yourself or another agent) | `.agents/skills/task-writing.md`     |
| Writing a PRD                                  | `.agents/templates/prd.md`           |
| Writing a task                                 | `.agents/templates/task.md`          |
| Logging a decision                             | `.agents/templates/adr.md`           |

## Definition of Done

A task is done when:

1. Code compiles (`pnpm build` clean)
2. Tests pass (`pnpm test`)
3. New behavior has at least one test
4. No new TypeScript errors
5. Public APIs have a one-line JSDoc (`/** ... */`)
6. Task file renamed to `done-*.md`
7. Any non-obvious decision logged as an ADR

## Memory Tools

Before loading any skill file, call `memory_overview` or `memory_find` first to check whether the project already has relevant knowledge stored:

```
# Quick warm-up (L0 abstracts only — cheap)
memory_overview

# Targeted search
memory_find { query: "pnpm workspaces" }
```

Only call `memory_read` when you need the full L2 content for a specific memory entry — it is the only tool that returns raw detail.

After completing a task, run `compound_learnings` with the task ID to extract reusable memories and persist them via `memory_overview` / the storage backend.

## Choosing a Memory Backend

The memory engine supports two backends, switchable via the `memory_config_set` MCP tool:

| Backend | Config value | Storage | Best for |
|---------|-------------|---------|---------|
| SQLite (default) | `"sqlite"` | `.agent-kanban/memory.db` | Fast FTS5 search, large stores, CI/CD |
| File mode | `"files"` | `docs/memory/<category>/<slug>.md` | Human-readable, git-committable, team sharing |

**SQLite** is the default and requires no configuration. The `.agent-kanban/` directory is gitignored.

**File mode** stores every memory as a standalone Markdown file with YAML frontmatter. Files under `docs/memory/` can be committed and reviewed in PRs. No `better-sqlite3` native addon required for read/write operations.

Switch with:
```
memory_config_set { backend: "files" }   # or "sqlite"
```

The change is persisted in `.agent-kanban/config.json` and takes effect on the next memory tool call.

