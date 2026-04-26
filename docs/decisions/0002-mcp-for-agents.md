# ADR-0002: MCP for Agent Integration

> Status: accepted
> Date: 2026-04-26
> Deciders: dila

## Context

AI agents (Claude Code, Cursor, Gemini CLI, etc.) need to interact with our markdown-based Kanban workflow. We need a standard protocol that:
- Works across multiple AI tools
- Lets agents create, move, and read tasks programmatically
- Doesn't require custom plugins per tool
- Uses the file system as the source of truth

## Decision

Use the **Model Context Protocol (MCP)** with stdio transport.

- Official TypeScript SDK (`@modelcontextprotocol/sdk`)
- 9 tools for Kanban operations (board_list, task CRUD, prd/adr create, next_id)
- 4 resources for read-only access (board, tasks, prds, adrs)
- stdio transport — simplest, works everywhere, no HTTP server needed
- The VS Code extension reads files directly (no MCP round-trip) for speed

## Consequences

### Positive
- Universal: any MCP-compatible agent can use our tools
- No server to run: stdio starts with the agent process
- File-based: no database, no state management, git-friendly
- Extensible: add new tools without breaking existing ones

### Negative / Trade-offs
- MCP is still maturing — SDK APIs may change
- stdio is single-connection (one agent at a time per process)
- No real-time push notifications (agents must poll or re-call)

### Neutral
- VS Code extension does NOT use MCP internally — it reads files directly
- Both extension and MCP server share `@agent-kanban/core` for parsing

## Alternatives Considered

### Option A: REST API server
- Pros: well-understood, multi-client
- Cons: requires running a server, HTTP overhead, not standard for agents
- Why rejected: MCP is the emerging standard for AI tool integration

### Option B: Language Server Protocol (LSP)
- Pros: VS Code native support
- Cons: designed for code intelligence, not task management
- Why rejected: wrong abstraction for our use case

### Option C: Direct file manipulation by agents
- Pros: zero infrastructure
- Cons: fragile regex parsing, no structured tools, each agent implements differently
- Why rejected: MCP gives agents structured tools instead of raw file access

## References

- PRD: `docs/prd/0002-kanban-mcp-vscode.md`
- MCP specification: https://modelcontextprotocol.io
