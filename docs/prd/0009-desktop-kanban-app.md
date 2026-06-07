# PRD-0009: Premium Desktop Kanban Application

> Status: shipped
> Owner: Antigravity
> Created: 2026-06-06

## Problem

While the VS Code extension provides a convenient in-editor Kanban board, some developers, project managers, or team members want a standalone, distraction-free desktop environment to manage their agent-kanban boards. They need a premium, responsive desktop experience with a Trello-like drag-and-drop interface, lateral sidebar navigation, configuration panels, and direct integration with the local workspace files and MCP companion tools.

## Users

- Developers who want a standalone board on a secondary monitor.
- Product managers/stakeholders who want to track agent progress without opening VS Code or a terminal.
- Teams utilizing agent-kanban workflows who need a shared or standalone visualization tool.

## User Stories

- As a **user**, I want to **launch a native desktop application**, so that **I can manage my boards without opening VS Code**.
- As a **user**, I want to **drag and drop tasks between columns (Todo, WIP, Done, Blocked)**, so that **I can easily update task statuses**.
- As a **user**, I want to **view and edit task details, PRDs, and ADRs in a premium UI modal/panel**, so that **I can inspect project specs and write requirements directly**.
- As a **user**, I want to **switch between multiple workspace projects**, so that **I can manage different codebases from a single app**.
- As a **user**, I want to **trigger agent tasks or copy MCP command scripts**, so that **I can easily copy-paste or command my AI agents to start implementing**.

## Acceptance Criteria

### Standalone Desktop Shell (Electron + Vite)
- [ ] Application starts successfully as a native Electron window on macOS, Windows, and Linux.
- [ ] Dev environment supports Hot Module Replacement (HMR) for both the renderer process (React) and main process (Electron).
- [ ] Production build script compiles a standalone binary executable.

### Premium Trello-style Board
- [ ] Columns for: **Todo**, **WIP**, **Done**, and **Blocked**.
- [ ] Drag-and-drop mechanism to move cards between columns.
- [ ] Cards display ID, Title, Priority/Tags, and completion progress of acceptance criteria.
- [ ] Clean, beautiful glassmorphism theme with smooth animations, curated dark/light palettes, and high-quality typography.

### Lateral Sidebar Navigation
- [ ] Sidebar to toggle between:
  - **Kanban Board** (Trello view)
  - **Documents** (PRD/ADR lists and inline markdown editor/viewer)
  - **System Monitor / Log** (Active tasks, MCP memory snapshots)
  - **Settings** (Workspace selection, MCP connection configs)

### Core Integration
- [ ] Integrates with `@agent-kanban/core` for board scanning, task writing, moving tasks, and parsing documents.
- [ ] Uses Electron IPC (Inter-Process Communication) to read/write workspace directories safely.
- [ ] Zustand store for state management (board state, active workspace, settings, UI states).
- [ ] Axios for any API interactions (e.g. hitting local MCP server endpoints or external integrations).
- [ ] Shadcn UI components for buttons, dialogs, dropdowns, forms, and cards, utilizing a beautiful dark-mode theme.

## Out of Scope

- Building a cloud-hosted web service (the desktop app works purely offline/locally).
- Auto-running agent command loops inside the Electron process (we provide quick-actions/command generation to be run in the developer's terminal/workspace runner instead, or through IPC commands, keeping runner environment decoupled).

## Open Questions

- **Tailwind Version**: Should we use Tailwind CSS v4 to match the VS Code webview structure?
- **IPC Interface**: Should we wrap the `@agent-kanban/core` functions directly in the Electron Main process and expose them via Electron contextBridge?
- **Workspace selection**: How does the user open a workspace? Standard directory picker dialog via Electron.

## References

- Related ADRs: `docs/decisions/0009-desktop-electron-architecture.md`
- Core Library: [packages/core](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/core)

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-0009-scaffold-desktop-app.md`
- [ ] `docs/tasks/todo-0009-ipc-and-core-integration.md`
- [ ] `docs/tasks/todo-0009-trello-board-ui.md`
- [ ] `docs/tasks/todo-0009-docs-and-editor-view.md`
