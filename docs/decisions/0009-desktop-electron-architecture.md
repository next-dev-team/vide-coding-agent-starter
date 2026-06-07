# ADR-0009: Desktop Application Architecture

> Status: accepted
> Date: 2026-06-06
> Deciders: Antigravity, USER

## Context

We need to build a standalone desktop application for managing Kanban boards in agent-kanban workspaces. The application must run locally, interact with the local filesystem, integrate with the `@agent-kanban/core` library, and provide a premium, modern user interface.
Key requirements from the user:
- Electron (latest)
- Vite (latest)
- React (latest)
- Zustand (latest)
- Axios (latest)
- Shadcn UI (premium look, simple Trello-style board)

## Decision

We will scaffold a new monorepo workspace package/app (tentatively named `apps/desktop-kanban` or `packages/desktop-kanban`) structured as an Electron + Vite + React application.

1. **Monorepo Integration**:
   - We will add the package path to `pnpm-workspace.yaml` (either as `apps/desktop-kanban` or `packages/desktop-kanban`).
   - We will depend on `@agent-kanban/core` using a `workspace:*` dependency so the desktop app can import core scanner, parser, and writer functions directly.

2. **IPC Communication & Failsafe Fs Operations**:
   - The Electron **Main Process** will import `@agent-kanban/core` and use Node.js filesystem modules to scan and parse workspaces.
   - The Electron **Renderer Process** (React application) will communicate with the Main process via Electron's `contextBridge` and custom `window.electronAPI` channels.
   - This ensures the UI remains fully decoupled from native filesystem calls, satisfying security and sandbox best practices.

3. **Frontend Stack**:
   - **React (latest)** as the view library.
   - **Vite (latest)** as the build tool and development server, configured with Electron integration plugins (e.g. `vite-plugin-electron` or standard multi-entry build configurations).
   - **Zustand** for lightweight client-side state management (board columns, active task detail, active workspace project path).
   - **Axios** for any HTTP communication (e.g., query local MCP companion server endpoints or trigger external task runners).
   - **Tailwind CSS v4** + **Shadcn UI** for components, styled with a high-fidelity dark-mode design system.

## Consequences

### Positive
- **Code Reuse**: We can reuse `@agent-kanban/core` directly since it's a monorepo workspace package.
- **Modern UI**: Tailwind CSS v4 and Shadcn UI enable extremely premium, animated, accessible, and themeable interfaces.
- **HMR Support**: Vite allows instant hot reloading for React components, speeding up development.
- **Safety**: Safe contextBridge-mediated IPC interface prevents exposing raw Node.js APIs directly to the frontend web page context.

### Negative / Trade-offs
- **Bundle Size**: Electron apps bundle Chromium and Node.js, resulting in larger binary sizes (approx. 100MB+ per platform).
- **Process Boundaries**: React cannot import core Node.js modules directly; every filesystem action must cross the IPC boundary.

## Alternatives Considered

### Tauri (Rust-based WebView)
- Pros: Extremely lightweight build size (~10MB), low memory usage.
- Cons: Requires Rust backend; does not natively support running full Node-based packages in the backend process easily without compiling Node.js binaries or writing complex Rust FFI/command interfaces.
- Why rejected: User explicitly requested Electron.

### Standalone Web App (Next.js/Vite)
- Pros: Runs in any standard browser.
- Cons: Cannot access local developer workspaces directly without running a background server or prompting the user to select directories on every single page load.
- Why rejected: User requested a desktop app like a VS Code extension replacement, which needs deep local workspace access.

## References

- PRDs: `docs/prd/0009-desktop-kanban-app.md`
