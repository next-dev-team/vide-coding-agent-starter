# Task 0009: Premium Desktop Kanban Application

> PRD: `docs/prd/0009-desktop-kanban-app.md`
> Created: 2026-06-06

## Goal

Create a standalone desktop application in the monorepo using Electron, Vite, React (latest), Zustand, Axios, and Tailwind CSS v4 / Shadcn UI with a premium Trello-like interface.

## Acceptance Criteria

- [x] Application starts successfully as a native Electron window on macOS, Windows, and Linux.
- [x] Columns for Todo, WIP, Blocked, Verified, and Done are visible on the board.
- [x] Drag-and-drop mechanism works to move cards between columns.
- [x] Detail modal displays task goals, acceptance checklists, and quick copy-paste commands.
- [x] Document Center lists PRD/ADR/Task files and lets users edit them in raw markdown.
- [x] All tests pass (`pnpm test`)
- [x] Build clean (`pnpm build`)

## Files Affected

- [NEW] [package.json](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/package.json)
- [NEW] [tsconfig.json](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/tsconfig.json)
- [NEW] [vite.config.ts](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/vite.config.ts)
- [NEW] [build.mjs](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/build.mjs)
- [NEW] [src/main/main.ts](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/main/main.ts)
- [NEW] [src/preload/preload.ts](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/preload/preload.ts)
- [NEW] [src/renderer/index.html](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/index.html)
- [NEW] [src/renderer/src/main.tsx](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/main.tsx)
- [NEW] [src/renderer/src/index.css](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/index.css)
- [NEW] [src/renderer/src/store.ts](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/store.ts)
- [NEW] [src/renderer/src/App.tsx](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/App.tsx)
- [NEW] [src/renderer/src/components/TrelloBoard.tsx](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/components/TrelloBoard.tsx)
- [NEW] [src/renderer/src/components/TaskCard.tsx](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/components/TaskCard.tsx)
- [NEW] [src/renderer/src/components/TaskDetailModal.tsx](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/components/TaskDetailModal.tsx)
- [NEW] [src/renderer/src/components/DocCenter.tsx](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/components/DocCenter.tsx)
- [NEW] [src/renderer/src/global.d.ts](file:///Users/silarim/Documents/GitHub/vide-coding-agent-starter/packages/desktop-kanban/src/renderer/src/global.d.ts)

## Approach

- Scaffold `@agent-kanban/desktop-app` as a monorepo workspace package.
- Write esbuild packaging script for Electron Main/Preload.
- Write Vite configuration for React Renderer using Tailwind CSS v4.
- Build Zustand state store to communicate with IPC bridge endpoints.
- Build premium glassmorphic UI components with full drag-and-drop and markdown editor support.

## Notes

- Checked columns length in `packages/core` scanner tests and `packages/mcp-server` integration tests: there was a mismatch where tests expected 5 columns but the source code has been updated to have 6 (adding `"achieved"` column). Fixed both tests. All 164 unit tests now pass.
