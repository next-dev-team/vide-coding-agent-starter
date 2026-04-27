# Agent Kanban

A platform for **AI-agent-driven development workflows**. Provides a CLI to scaffold projects, an MCP server for agent integration, a VS Code Kanban board, and starter templates with built-in task management.

> Built as a learning project — prefer **clarity over cleverness**.

## What's Inside

```
packages/
├── core/              Shared markdown parser, writer, scanner
├── cli/               create-kanban-app — scaffold projects from templates
├── mcp-server/        MCP server for AI agents to manage tasks/PRDs/ADRs
└── vscode-extension/  Kanban board for VS Code (sidebar + status bar)

templates/
├── shared/            Common .agents/ + docs/ structure (all templates get this)
├── todo-vite-react/   Working React + Vite todo app
├── todo-flutter/      Flutter placeholder (you build it)
└── blank/             Docs-only scaffold
```

---

## Quick Start

### 1. Scaffold a New Project

```bash
npx create-kanban-app my-project --template todo-vite-react
cd my-project
npm install
npm run dev
```

### 2. Available Templates

| Template           | Description                                        |
| ------------------ | -------------------------------------------------- |
| `todo-vite-react`  | Working React todo app with Vite + TypeScript       |
| `todo-flutter`     | Flutter placeholder with agent skills               |
| `blank`            | Minimal docs/ + .agents/ structure only             |

```bash
npx create-kanban-app --list     # see all templates
npx create-kanban-app doctor     # validate your project structure
```

---

## MCP Server Setup

The MCP server lets **any AI agent** manage your Kanban board programmatically — create tasks, move cards, read PRDs, etc.

<details>
<summary><strong>Available MCP Tools</strong></summary>

| Tool           | Description                                    |
| -------------- | ---------------------------------------------- |
| `board_list`   | Show full Kanban board (TODO/WIP/DONE/BLOCKED) |
| `task_create`  | Create a new task from template                |
| `task_move`    | Move task between columns (renames file)       |
| `task_read`    | Read parsed task content                       |
| `task_update`  | Tick checkboxes or add notes                   |
| `prd_create`   | Create a new PRD                               |
| `prd_list`     | List all PRDs                                  |
| `adr_create`   | Create a new ADR                               |
| `next_id`      | Get next sequential ID                         |

</details>

<details>
<summary><strong>Available MCP Resources</strong></summary>

| Resource URI       | Description                               |
| ------------------ | ----------------------------------------- |
| `kanban://board`   | Full board state as structured JSON       |
| `kanban://tasks`   | All tasks as a flat list                  |
| `kanban://prds`    | All product requirement documents         |
| `kanban://adrs`    | All architecture decision records         |

</details>

<details>
<summary><strong>Setup for Cursor</strong></summary>

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"],
      "cwd": "."
    }
  }
}
```

Or in your global Cursor settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>Setup for Claude Code / Anthropic</strong></summary>

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Or add it via the CLI:

```bash
claude mcp add kanban node /absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js
```

</details>

<details>
<summary><strong>Setup for Gemini CLI</strong></summary>

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>Setup for VS Code Copilot (GitHub Copilot)</strong></summary>

Add to `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "kanban": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>Setup for Windsurf / Codeium</strong></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>Setup for Antigravity</strong></summary>

Add to your workspace or global MCP settings:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>Windows Users</strong></summary>

On Windows, replace paths with backslashes or use forward slashes:

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["C:/Users/you/agent-kanban/packages/mcp-server/dist/index.js"]
    }
  }
}
```

</details>

> **Tip**: After adding the config, restart your AI tool. Then ask your agent: *"Use the board_list tool to show me my Kanban board."*

---

## VS Code Extension

The extension provides a **Kanban board sidebar** that auto-syncs with your `docs/tasks/` directory.

### Features

- **Kanban Board** — Tabbed interface for TODO, WIP, BLOCKED, DONE
- **Click to Open** — Click any card to open the task markdown in the editor
- **Move Buttons** — Hover a card to see quick-move buttons
- **Progress Bars** — Shows acceptance criteria completion per task
- **Status Bar** — Live count of tasks by status
- **File Watcher** — Board updates automatically when files change
- **Create Commands** — `Agent Kanban: New Task` and `Agent Kanban: New PRD` commands
- **Auto-activation** — Only activates in workspaces with `docs/tasks/` directory

### Install (Development)

There are a few ways to test the extension locally:

**1. Debug via VS Code (Recommended)**
Open the monorepo root in VS Code and press **F5** (or use the "Run and Debug" view). It will launch a new Extension Development Host window. Be sure to run `pnpm --filter agent-kanban-vscode dev` in the background to recompile your changes automatically.

**2. CLI Launch**
```bash
code --extensionDevelopmentPath=./packages/vscode-extension
```

**3. Build a `.vsix` Package**
```bash
cd packages/vscode-extension
npx @vscode/vsce package --no-dependencies
code --install-extension agent-kanban-vscode-0.1.0.vsix
```

### How It Works with MCP

The VS Code extension and MCP server share the same source of truth — **your markdown files**:

```
┌──────────────────┐     ┌──────────────────┐
│  VS Code Ext     │     │   AI Agent       │
│  (Kanban Board)  │     │  (via MCP)       │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │  reads/writes          │  reads/writes
         │                        │
         ▼                        ▼
┌──────────────────────────────────────────────┐
│          docs/tasks/*.md                      │
│          docs/prd/*.md                        │
│          docs/decisions/*.md                  │
│          (File System = Source of Truth)       │
└──────────────────────────────────────────────┘
```

- **You** click a move button in the Kanban board → file gets renamed
- **Agent** calls `task_move` via MCP → file gets renamed
- **File watcher** detects the change → board updates in real-time

Both humans and agents work on the same files. No sync needed.

---

## Development (this repo)

```bash
pnpm install      # install all workspace deps
pnpm build        # build all packages
pnpm test         # run all tests
```

### Package Overview

| Package                  | Description                           | Build    |
| ------------------------ | ------------------------------------- | -------- |
| `@agent-kanban/core`     | Markdown parser, writer, scanner      | `tsc`    |
| `create-kanban-app`      | CLI for scaffolding projects          | `tsc`    |
| `@agent-kanban/mcp-server` | MCP server (stdio)                  | `tsc`    |
| `agent-kanban-vscode`    | VS Code extension                     | esbuild  |

### Workflow

1. **Idea** → write a PRD in `docs/prd/`
2. **PRD** → break into tasks in `docs/tasks/`
3. **Task** → hand to an agent or code it yourself
4. **Decision** → log non-trivial choices as ADRs in `docs/decisions/`
5. **Done** → rename `wip-NNNN-...md` to `done-NNNN-...md`

### Task File Naming

```
docs/tasks/{prefix}-{NNNN}-{slug}.md
```

| Prefix     | Meaning            |
| ---------- | ------------------ |
| `todo-`    | Not started        |
| `wip-`     | In progress        |
| `done-`    | Completed          |
| `blocked-` | Blocked            |

**Status is the filename prefix. Rename the file to change status.**

---

## Roadmap

- [x] `@agent-kanban/core` — parser, writer, scanner
- [x] `create-kanban-app` CLI — scaffold projects
- [x] MCP server — 9 tools, 4 resources
- [x] VS Code extension — Kanban board, tabs, status bar
- [ ] Publish `create-kanban-app` to npm
- [ ] Publish VS Code extension to marketplace
- [ ] Add tests for core parser/writer
- [ ] Chat tabs per task in VS Code
- [ ] Template contributions (Next.js, Python, Go, etc.)

## License

MIT
