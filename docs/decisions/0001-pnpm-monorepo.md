# ADR-0001: pnpm Monorepo with TypeScript

> Status: accepted
> Date: 2026-04-26
> Deciders: dila

## Context

We need to ship multiple related packages:
- A shared core library (markdown parsing/writing)
- A CLI for scaffolding projects
- An MCP server for AI agents
- A VS Code extension

These all share the same core logic and types. We need a way to:
- Share code between packages without publishing to npm
- Build and test all packages together
- Keep each package independently deployable

## Decision

Use a **pnpm workspace monorepo** with TypeScript project references.

- `pnpm-workspace.yaml` lists `packages/*`
- Each package has its own `package.json` and `tsconfig.json`
- Shared code via `workspace:*` protocol
- TypeScript `composite: true` + `references` for incremental builds
- esbuild for the VS Code extension (needs single-file bundle)

## Consequences

### Positive
- Zero-cost code sharing via workspace protocol
- Incremental builds with `tsc --build`
- Each package can be published independently
- `pnpm -r build` builds everything in dependency order

### Negative / Trade-offs
- Requires pnpm (not npm/yarn) — team must install it
- TypeScript project references add config complexity
- VS Code extension needs esbuild (can't use raw tsc output — must bundle)

### Neutral
- No Turborepo or Nx — keeping it simple for now
- Templates are NOT workspace packages (they're static files copied by CLI)

## Alternatives Considered

### Option A: Separate repos
- Pros: full isolation
- Cons: code duplication, version drift, painful to maintain
- Why rejected: too much overhead for a small team

### Option B: npm workspaces
- Pros: no extra tool
- Cons: slower, less strict, no workspace protocol
- Why rejected: pnpm is faster and handles workspace deps better

### Option C: Turborepo
- Pros: caching, parallel builds
- Cons: another dependency, overkill for 4 packages
- Why rejected: can add later if builds get slow

## References

- PRD: `docs/prd/0002-kanban-mcp-vscode.md`
- pnpm workspaces: https://pnpm.io/workspaces
