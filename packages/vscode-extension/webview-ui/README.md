# @agent-kanban/webview-ui

Svelte 5 + Tailwind v4 + shadcn-svelte UI shell for the VS Code extension webviews.

## Why a separate package?

The extension currently renders all webviews via hand-written HTML strings (`packages/vscode-extension/src/webview/*.ts`). That works but is at its complexity ceiling. This package is the migration target — a real component model, design tokens, and Vite HMR — so we can ship a Trello-simple, Jira-dense Kanban experience.

## What's here

```
src/
  sidebar/           # narrow accordion view (loaded by sidebar webview)
    Sidebar.svelte
    main.ts
  board/             # wide editor-area board (loaded by board webview)
    Board.svelte
    main.ts
  lib/
    components/
      TaskCard.svelte
      ui/            # shadcn-svelte primitives (Button, Card, Badge)
    theme.css        # Tailwind v4 + VS Code → shadcn token bridge
    vscode.ts        # typed acquireVsCodeApi + onMessage
    types.ts         # wire types (Board, Task, messages)
    utils.ts         # cn() class merger
    demo-board.ts    # static fixture for vite preview
```

Two entry points produce two HTML files (`sidebar.html`, `board.html`) plus hashed assets in `dist/`. The extension reads `dist/.vite/manifest.json` to inject CSP-nonced `<script>` and `<link>` tags.

## Theme bridge

Webviews inherit `--vscode-*` CSS variables from the host. `theme.css` re-exports them under shadcn's expected token names (`--color-background`, `--color-foreground`, etc.) via Tailwind v4's `@theme inline` block — so shadcn-svelte components match the user's editor theme automatically.

Status pills use semantic `--color-status-*` tokens mapped to VS Code's chart colors.

## Develop

First install once at the repo root:

```sh
pnpm install
```

Then in this package:

```sh
pnpm --filter @agent-kanban/webview-ui dev      # rebuild on change
pnpm --filter @agent-kanban/webview-ui build    # production bundle
pnpm --filter @agent-kanban/webview-ui preview  # browser preview (host-less, uses demo-board)
pnpm --filter @agent-kanban/webview-ui typecheck
```

`preview` runs without a VS Code host — the `vscode.ts` bridge falls back to a noop and the demo fixture renders so you can iterate on visuals in a regular browser.

## Adding shadcn-svelte components

```sh
cd packages/webview-ui
npx shadcn-svelte@latest add dialog dropdown-menu tooltip
```

Components land under `src/lib/components/ui/`. The `components.json` here is already configured (style: default, baseColor: slate, alias `$lib`).

## CSP

Vite emits ES modules. VS Code webviews require a `nonce` on every inline `<script>` and a `script-src` CSP that lists the webview's resource origin. The host extension handles this by reading the manifest and rewriting paths through `webview.asWebviewUri(...)`. See the wiring task once it's filed.

## Next steps

1. Wire host integration in `packages/vscode-extension/src/webview/panel-board.ts` (new) — read manifest, inject nonced tags, set `localResourceRoots`.
2. Add `svelte-dnd-action` for drag-and-drop between columns.
3. Port remaining tabs (Docs, Skills, Workflow, MCP, Memory) one per session.
