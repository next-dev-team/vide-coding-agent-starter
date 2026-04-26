# PRD-0002: Agent Kanban Platform (Monorepo + MCP + CLI + VS Code)

> Status: shipped
> Owner: dila
> Created: 2026-04-26

## Problem

AI agents and developers share a markdown-based Kanban workflow (`docs/tasks/`, `docs/prd/`, `docs/decisions/`) but there's no tooling around it:

1. **No scaffolding** — New developers must manually copy templates and directory structures
2. **No agent tools** — Agents read/write raw markdown instead of calling structured MCP tools
3. **No visual board** — Humans rename files by hand instead of dragging cards on a Kanban board
4. **No starter variety** — Only Flutter is templated; React/Vite/Node users have no on-ramp

We need a **platform** — a monorepo that ships a CLI, an MCP server, a VS Code extension, and pluggable starter templates.

## Users

| User             | Needs                                                         |
| ---------------- | ------------------------------------------------------------- |
| New developer    | `npx create-kanban-app my-project --template todo-vite-react` |
| AI Agent         | MCP tools to create/move/read tasks, PRDs, ADRs               |
| Developer in IDE | VS Code Kanban board to drag cards and chat about tasks        |
| Template author  | Drop a folder in `templates/` and it's instantly available     |

## User Stories

- As a **new developer**, I want to **run a single CLI command to scaffold a project**, so that **I get the docs/ structure, .agents/ skills, and a working app in one step**.
- As a **new developer**, I want to **choose from templates** (React, Flutter, plain), so that **I start with a stack I know**.
- As an **AI agent**, I want to **call MCP tools to create/move/read tasks**, so that **I manage work without parsing raw markdown**.
- As a **developer**, I want to **see a Trello-like Kanban board in VS Code**, so that **I can drag tasks between columns visually**.
- As a **developer**, I want **chat tabs per task**, so that **I can discuss tasks with my AI agent in context**.
- As a **template author**, I want to **add a new template by creating a folder**, so that **the CLI picks it up automatically**.

## Architecture

```
agent-kanban/                          ← pnpm monorepo root
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                         ← (optional) Turborepo for build orchestration
├── AGENTS.md                          ← agent rules for THIS repo
├── docs/                              ← PRDs, tasks, ADRs for THIS repo
│
├── packages/
│   ├── core/                          ← shared logic (markdown parser, file ops)
│   │   ├── src/
│   │   │   ├── parser.ts              ← parse task/prd/adr markdown → structured data
│   │   │   ├── writer.ts              ← structured data → markdown (from templates)
│   │   │   ├── scanner.ts             ← scan docs/ directory, build board state
│   │   │   └── types.ts               ← shared TypeScript types
│   │   └── package.json
│   │
│   ├── cli/                           ← CLI tool: `create-kanban-app`
│   │   ├── src/
│   │   │   ├── index.ts               ← entry point
│   │   │   ├── commands/
│   │   │   │   ├── init.ts            ← scaffold a new project from template
│   │   │   │   ├── list-templates.ts  ← show available templates
│   │   │   │   └── doctor.ts          ← validate project structure
│   │   │   └── utils/
│   │   │       └── copy-template.ts   ← copy + transform template files
│   │   └── package.json               ← bin: { "create-kanban-app": "..." }
│   │
│   ├── mcp-server/                    ← MCP server (stdio)
│   │   ├── src/
│   │   │   ├── index.ts               ← MCP server entry
│   │   │   ├── tools/                 ← one file per MCP tool
│   │   │   │   ├── board-list.ts
│   │   │   │   ├── task-create.ts
│   │   │   │   ├── task-move.ts
│   │   │   │   ├── task-read.ts
│   │   │   │   ├── task-update.ts
│   │   │   │   ├── prd-create.ts
│   │   │   │   ├── prd-list.ts
│   │   │   │   ├── adr-create.ts
│   │   │   │   └── next-id.ts
│   │   │   └── resources/             ← MCP resource handlers
│   │   └── package.json
│   │
│   └── vscode-extension/              ← VS Code extension
│       ├── src/
│       │   ├── extension.ts           ← activation, commands, file watcher
│       │   ├── kanban-provider.ts     ← webview provider
│       │   ├── status-bar.ts          ← TODO: 3 | WIP: 1 | BLOCKED: 0
│       │   └── chat/                  ← chat tab logic
│       ├── webview/                   ← Svelte app for the Kanban UI
│       │   ├── src/
│       │   │   ├── App.svelte
│       │   │   ├── Board.svelte       ← 4-column Kanban
│       │   │   ├── Card.svelte        ← task card with drag handle
│       │   │   ├── ChatPanel.svelte   ← bottom chat tabs
│       │   │   └── CreateDialog.svelte
│       │   └── vite.config.ts
│       └── package.json
│
├── templates/                         ← starter templates (copied by CLI)
│   ├── shared/                        ← common files ALL templates get
│   │   ├── .agents/
│   │   │   ├── skills/
│   │   │   │   └── task-writing.md
│   │   │   ├── templates/
│   │   │   │   ├── prd.md
│   │   │   │   ├── task.md
│   │   │   │   └── adr.md
│   │   │   └── workflows/
│   │   │       └── feature-loop.md
│   │   ├── docs/
│   │   │   ├── README.md
│   │   │   ├── prd/
│   │   │   ├── tasks/
│   │   │   └── decisions/
│   │   └── AGENTS.md                  ← generic version (no Flutter-specific refs)
│   │
│   ├── todo-vite-react/               ← working React todo app
│   │   ├── template.json              ← { "name": "Todo (Vite + React)", ... }
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   ├── AGENTS.md                  ← React-specific agent rules (overrides shared)
│   │   └── docs/
│   │       └── prd/0001-add-todo.md   ← worked example PRD
│   │
│   ├── todo-flutter/                  ← Flutter placeholder
│   │   ├── template.json              ← { "name": "Todo (Flutter)", ... }
│   │   ├── AGENTS.md                  ← current Flutter AGENTS.md
│   │   ├── .agents/skills/            ← Flutter-specific skills
│   │   └── docs/                      ← current worked examples
│   │
│   └── blank/                         ← minimal: just docs/ + .agents/
│       ├── template.json
│       └── AGENTS.md
│
└── apps/                              ← dev playground (gitignored or for testing)
    └── .gitkeep
```

## CLI Usage

```bash
# Scaffold a new project
npx create-kanban-app my-todo --template todo-vite-react

# List available templates
npx create-kanban-app --list

# Scaffold in current directory
npx create-kanban-app . --template blank

# Validate project structure
npx create-kanban-app doctor
```

**What the CLI does on `init`:**
1. Copy `templates/shared/` → target directory
2. Copy `templates/{chosen}/` → target directory (overrides shared files)
3. Merge `AGENTS.md` (shared base + template-specific additions)
4. Run `npm install` or `flutter pub get` based on template type
5. Initialize git repo
6. Print "Next steps" with first task to try

### template.json spec

```json
{
  "name": "Todo (Vite + React)",
  "description": "A working React todo app with Vite, ready for AI-driven development",
  "stack": {
    "framework": "React 19",
    "language": "TypeScript",
    "bundler": "Vite",
    "state": "React hooks",
    "storage": "localStorage"
  },
  "postInstall": "npm install",
  "firstTask": "docs/tasks/todo-0001-add-todo-input.md"
}
```

## Deliverables

### D1: pnpm Monorepo Setup
- `pnpm-workspace.yaml` with `packages/*` and `templates/*`
- Root `package.json` with shared dev dependencies
- TypeScript project references
- Shared ESLint + Prettier config

### D2: `@agent-kanban/core` — Shared Logic
- Markdown parser (task → structured data)
- Markdown writer (structured data → markdown from templates)
- Directory scanner (build board state from `docs/`)
- Shared TypeScript types

### D3: `create-kanban-app` CLI
- `init` command with `--template` flag
- Template discovery from `templates/` directory
- `template.json` spec for metadata
- `--list` to show available templates
- `doctor` to validate project structure

### D4: `@agent-kanban/mcp-server` — MCP Server
- 9 tools (board_list, task_create/move/read/update, prd_create/list, adr_create, next_id)
- 5 resources (kanban://board, task, prd, adr, templates)
- Stdio transport
- Uses `@agent-kanban/core` for parsing/writing

### D5: `@agent-kanban/vscode` — VS Code Extension
- Kanban board webview (Svelte)
- Drag & drop between columns
- Card click → open markdown
- Create dialogs for PRD/task/ADR
- File watcher for real-time sync
- Chat tabs per task
- Status bar with counts

### D6: Starter Templates
- `templates/shared/` — common docs/agents structure
- `templates/todo-vite-react/` — working React todo app
- `templates/todo-flutter/` — Flutter placeholder (current repo content)
- `templates/blank/` — minimal docs-only scaffold

## Acceptance Criteria

### Monorepo
- [ ] `pnpm install` succeeds from root
- [ ] `pnpm build` builds all packages
- [ ] `pnpm test` runs all tests
- [ ] Packages can import from `@agent-kanban/core`

### CLI
- [ ] `npx create-kanban-app my-app --template todo-vite-react` creates a working project
- [ ] `npx create-kanban-app my-app --template todo-flutter` creates Flutter placeholder
- [ ] `npx create-kanban-app my-app --template blank` creates docs-only scaffold
- [ ] `npx create-kanban-app --list` shows all templates with descriptions
- [ ] `npx create-kanban-app doctor` validates docs/ structure exists
- [ ] Generated project's `AGENTS.md` is correct for the chosen stack
- [ ] Generated project has working `.agents/` skills and templates

### MCP Server
- [ ] `board_list` returns structured JSON with columns and cards
- [ ] `task_create` creates correct file from template
- [ ] `task_move` renames file prefix (todo → wip → done)
- [ ] `task_update` ticks/unticks checkboxes
- [ ] `next_id` returns correct sequential number
- [ ] Works with Gemini CLI and Cursor
- [ ] README has `mcp.json` config example

### VS Code Extension
- [ ] Kanban board renders 4 columns from `docs/tasks/`
- [ ] Drag & drop moves cards (renames files)
- [ ] Click card opens markdown in editor
- [ ] "New Task" creates task via form
- [ ] File watcher updates board in real-time
- [ ] Chat tab loads with task context
- [ ] Status bar shows counts

### Templates
- [ ] `todo-vite-react` runs with `npm run dev` after scaffold
- [ ] `todo-flutter` has placeholder README explaining "add Flutter project"
- [ ] `blank` has just docs/ and .agents/ structure
- [ ] All templates include worked example PRD-0001

## Out of Scope

- Backend/cloud sync (local-first, file-based)
- Multi-user collaboration
- Mobile app
- Gantt chart or timeline view
- Time tracking
- Integration with GitHub Issues, Jira, Linear
- Template hot-reloading or updates after scaffold

## Open Questions

- Q1: **Package naming** — `@agent-kanban/*` or `@kanban-flow/*` or something else?
  **Proposed:** `@agent-kanban/*` — clear that it's agent-focused.
- Q2: **VS Code webview framework** — React, Svelte, or plain HTML?
  **Proposed:** Svelte — lightweight, fast, good webview DX.
- Q3: **Should the extension bundle the MCP server** or require separate install?
  **Proposed:** Bundle it — one install for everything.
- Q4: **Monorepo tool** — pnpm workspaces only, or add Turborepo?
  **Proposed:** Start with pnpm workspaces only; add Turbo later if builds get slow.
- Q5: **Repo rename** — Current repo is `todo-flutter-starter`. Rename to `agent-kanban`?
  **Proposed:** Yes — this is no longer Flutter-specific.

## References

- Task-writing skill: `.agents/skills/task-writing.md`
- Feature loop workflow: `.agents/workflows/feature-loop.md`
- MCP SDK: https://modelcontextprotocol.io/docs
- VS Code Webview API: https://code.visualstudio.com/api/extension-guides/webview
- pnpm workspaces: https://pnpm.io/workspaces

---

**Tasks generated from this PRD:**

### Phase 1: Foundation
- [ ] `docs/tasks/todo-0002a-monorepo-setup.md`
- [ ] `docs/tasks/todo-0002b-core-package.md`

### Phase 2: CLI + Templates
- [ ] `docs/tasks/todo-0002c-cli-scaffold.md`
- [ ] `docs/tasks/todo-0002d-template-shared.md`
- [ ] `docs/tasks/todo-0002e-template-vite-react.md`
- [ ] `docs/tasks/todo-0002f-template-flutter.md`

### Phase 3: MCP Server
- [ ] `docs/tasks/todo-0002g-mcp-server-scaffold.md`
- [ ] `docs/tasks/todo-0002h-mcp-board-tools.md`
- [ ] `docs/tasks/todo-0002i-mcp-task-tools.md`
- [ ] `docs/tasks/todo-0002j-mcp-prd-adr-tools.md`

### Phase 4: VS Code Extension
- [ ] `docs/tasks/todo-0002k-vscode-scaffold.md`
- [ ] `docs/tasks/todo-0002l-vscode-kanban-board.md`
- [ ] `docs/tasks/todo-0002m-vscode-drag-drop.md`
- [ ] `docs/tasks/todo-0002n-vscode-chat-tabs.md`
