# Task 0000: Init Monorepo

> PRD: (none)
> Created: 2026-04-26

## Goal

Set up the pnpm monorepo with all 4 packages, 3 starter templates, and build infrastructure.

## Acceptance Criteria

- [x] pnpm workspace with `packages/*`
- [ ] `@agent-kanban/core` — parser, writer, scanner, types
- [x] `create-kanban-app` CLI — init, --list, doctor
- [x] `@agent-kanban/mcp-server` — 9 tools, 4 resources, stdio
- [x] `agent-kanban-vscode` — Kanban board webview, status bar, file watcher
- [x] `templates/shared/` — generic .agents + docs
- [x] `templates/todo-vite-react/` — working React todo app
- [ ] `templates/todo-flutter/` — placeholder with Flutter skills
- [x] `templates/blank/` — docs-only scaffold
- [x] `pnpm build` compiles all packages
- [x] CLI --list shows 3 templates
- [x] CLI scaffold creates correct directory structure

## Files Likely Affected

- `package.json` — new (root)
- `pnpm-workspace.yaml` — new
- `tsconfig.json` — new
- `packages/*/` — new (4 packages)
- `templates/*/` — new (4 templates)
- `AGENTS.md` — rewritten for monorepo
- `README.md` — rewritten for platform

## Approach

- Set up pnpm workspace
- Build core package first (types, parser, writer, scanner)
- Build CLI, MCP server, VS Code extension on top of core
- Create starter templates
- Update all root docs for the new architecture

## Open Questions

(none)

## Notes

- Monorepo created and all packages building clean in one session.

## When Done

- [x] Rename file from `wip-` to `done-`
- [x] All packages build (`pnpm build`)
- [x] CLI tested end-to-end
