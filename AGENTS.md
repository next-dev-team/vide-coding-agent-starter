# AGENTS.md

Instructions for AI coding agents working in this repo.

## Project

**agent-kanban** — Agent-driven Kanban platform: MCP server, CLI, VS Code extension, and starter templates

This is a pnpm monorepo with 4 packages:

- **`create-kanban-app`** (packages/cli) — Scaffold a new project with agent-driven Kanban workflow
- **`@agent-kanban/core`** (packages/core) — Shared logic for parsing, writing, and scanning markdown-based Kanban workflows
- **`@agent-kanban/mcp-server`** (packages/mcp-server) — MCP server for managing markdown-based Kanban workflows
- **`agent-kanban-vscode`** (packages/vscode-extension) — Trello-like Kanban board for markdown-based task management — works with AI agents via MCP

## Tech Stack

| Layer           | Choice          |
| --------------- | --------------- |
| Language        | TypeScript      |
| Package Manager | pnpm (monorepo) |

Do **not** add new packages without asking. Propose with a one-line reason first.

## Commands

| Task         | Command          |
| ------------ | ---------------- |
| Install deps | `pnpm install`   |
| Build        | `pnpm build`     |
| Dev          | `pnpm dev`       |
| Test         | `pnpm test`      |
| Lint         | `pnpm lint`      |
| Typecheck    | `pnpm typecheck` |
| Clean        | `pnpm clean`     |

Always run `pnpm build` and `pnpm test` before saying a task is done.

## Project Structure

```
todo-flutter-starter/
├── .agents/
├── apps/
├── docs/
├── packages/
├── templates/
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
- **No `console.log`** in library code — return structured data.

## Workflow

When the user gives you a **PRD** or **task file**, follow the loop in `.agents/workflows/feature-loop.md`.

When making a **non-trivial architectural choice**, write an ADR using `.agents/templates/adr.md`.

When the user describes a **new feature in chat without a PRD**, offer to draft one first.

Task files in `docs/tasks/` use a status prefix in the filename:

| Prefix      | Meaning                    |
| ----------- | -------------------------- |
| `todo-`     | Not started                |
| `wip-`      | In progress                |
| `verified-` | QA Verified                |
| `done-`     | Completed                  |
| `blocked-`  | Blocked, see Notes section |

Rename the file to update status — don't edit a status field inside.

## MCP Companion Servers

This project relies on multiple MCP servers working together. Configure them in your IDE's MCP settings:

| Server           | Purpose                             | When to use                                                  |
| ---------------- | ----------------------------------- | ------------------------------------------------------------ |
| **agent-kanban** | Task management, memory, PRDs, ADRs | Always — core workflow orchestration                         |
| **context7**     | Live documentation lookup           | Before using any library API, framework feature, or CLI tool |
| **playwright**   | Browser automation & testing        | UI verification, E2E testing, visual regression              |

### Context7 — Documentation-First Development

**Always use Context7 before writing code that touches a library or framework** — even well-known ones. Your training data may be stale; Context7 fetches the latest docs.

**Workflow:**

1. Call `resolve-library-id` to find the Context7 library ID
2. Call `query-docs` with the resolved ID and your specific question
3. If the first answer is insufficient, retry with `researchMode: true`

**When to use:**

- API syntax or configuration for any dependency
- Version migration or breaking change checks
- Library-specific debugging or setup instructions
- CLI tool usage patterns

### Playwright — Browser Automation & Testing

**Use Playwright for any task that requires interacting with or verifying a running web application.**

**When to use:**

- Verifying UI renders correctly after changes
- E2E testing of web-based features
- Taking screenshots for visual comparison
- Filling forms, clicking buttons, navigating pages

**Rule:** When acceptance criteria include UI behavior, use Playwright to verify before marking done.

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
- Renaming a task file to update its status
- Using Context7 to look up library documentation
- Using Playwright to verify UI changes

## Skills & References

| Task involves...                  | Read / Use                                                 |
| --------------------------------- | ---------------------------------------------------------- |
| Working from a PRD or task        | `.agents/workflows/feature-loop.md`                        |
| Writing a PRD                     | `.agents/templates/prd.md`                                 |
| Writing a task                    | `.agents/templates/task.md`                                |
| Logging a decision                | `.agents/templates/adr.md`                                 |
| Looking up library/framework docs | Context7 MCP → `resolve-library-id` then `query-docs`      |
| Verifying UI or running E2E tests | Playwright MCP → `navigate`, `screenshot`, `click`, `fill` |

## Definition of Done

A task is done when:

1. Code compiles (`pnpm build` clean)
2. Tests pass (`pnpm test`)
3. New behavior has at least one test
4. No new TypeScript errors
5. Public APIs have a one-line JSDoc (`/** ... */`)
6. Task file renamed to `done-*.md`
