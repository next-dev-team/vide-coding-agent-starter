import {
  scanBoard,
  scanTasks,
  scanPrds,
  scanAdrs,
} from "@agent-kanban/core";

// ─── Review checklists (embedded as constants — no file I/O needed) ──────────

const SECURITY_REVIEW_MD = `# Security Review Checklist

Use this resource when reviewing code changes for security issues.

## Authentication & Authorization
- [ ] No hardcoded credentials, API keys, or secrets in code
- [ ] All endpoints require appropriate authentication
- [ ] Authorization checks are performed server-side, not just client-side
- [ ] Principle of least privilege applied to permissions

## Input Validation
- [ ] All user inputs are validated and sanitized
- [ ] Path traversal attacks mitigated (e.g. no unchecked \`../\` in paths)
- [ ] Command injection mitigated (no \`exec\`/\`spawn\` with raw user input)
- [ ] SQL injection mitigated (parameterized queries used)

## Data Handling
- [ ] Sensitive data (passwords, tokens) never logged
- [ ] PII is minimized and protected
- [ ] Secrets loaded from environment variables or secret manager, not config files
- [ ] \`.gitignore\` excludes credential files and \`.env\`

## Dependencies
- [ ] No known vulnerable packages (\`npm audit\` clean)
- [ ] Dependencies are pinned or ranged conservatively
- [ ] No new packages added without explicit approval

## Error Handling
- [ ] Errors never leak internal stack traces or paths to end users
- [ ] Error messages are generic for security-sensitive failures (auth, not-found)

## File System
- [ ] File paths are validated before use
- [ ] Write operations are restricted to expected directories
- [ ] Temporary files are cleaned up and not world-readable

## Instructions for the Agent
1. Read the diff or changed files.
2. Work through each checklist section above.
3. Flag any failing checks with: file, line, issue, and recommended fix.
4. If no issues found, respond: "Security review complete — no issues found."
`;

const PERFORMANCE_REVIEW_MD = `# Performance Review Checklist

Use this resource when reviewing code changes for performance issues.

## Algorithmic Complexity
- [ ] No O(n²) or worse loops where O(n log n) or better is achievable
- [ ] Early exits used where possible (short-circuit evaluation)
- [ ] Recursion has proper base cases and won't cause stack overflow on large inputs

## I/O & Async
- [ ] File reads/writes are async where feasible (avoid blocking \`readFileSync\` in hot paths)
- [ ] Database queries avoid N+1 patterns (batch queries instead of per-item queries)
- [ ] Unnecessary serial \`await\` not replaced by parallel \`Promise.all\` where safe

## Memory
- [ ] Large arrays/objects are not retained in memory longer than needed
- [ ] Streams used for large file processing instead of loading entire file into memory
- [ ] Caches have eviction policies (bounded size, TTL) — no unbounded growth

## Caching
- [ ] Expensive computations cached when inputs are stable
- [ ] Cache keys are stable and deterministic
- [ ] Cache invalidation is correct (no stale reads)

## Database
- [ ] Indexes exist for all filter/sort columns
- [ ] FTS queries use prepared statements, not concatenated strings
- [ ] Transactions batched for multi-row writes

## VS Code Extension Specific
- [ ] WebView HTML is not regenerated on every key press
- [ ] \`postMessage\` is debounced for high-frequency events
- [ ] File watchers use \`glob\` patterns, not watching entire workspace

## Instructions for the Agent
1. Read the diff or changed files.
2. Work through each checklist section above.
3. Flag any failing checks with: file, line, issue, estimated impact (low/medium/high), and recommended fix.
4. If no issues found, respond: "Performance review complete — no issues found."
`;

/** All MCP resource definitions. */
export function registerResources() {
  return [
    {
      uri: "kanban://board",
      name: "Kanban Board",
      description: "Full board state with all tasks grouped by status columns",
      mimeType: "application/json",
    },
    {
      uri: "kanban://tasks",
      name: "All Tasks",
      description: "All tasks as a flat list",
      mimeType: "application/json",
    },
    {
      uri: "kanban://prds",
      name: "All PRDs",
      description: "All product requirement documents",
      mimeType: "application/json",
    },
    {
      uri: "kanban://adrs",
      name: "All ADRs",
      description: "All architecture decision records",
      mimeType: "application/json",
    },
    {
      uri: "kanban://review/security",
      name: "Security Review Checklist",
      description:
        "Markdown checklist and instructions for a security-focused code review. Use when reviewing changes for auth, input validation, secrets, and OWASP issues.",
      mimeType: "text/markdown",
    },
    {
      uri: "kanban://review/performance",
      name: "Performance Review Checklist",
      description:
        "Markdown checklist and instructions for a performance-focused code review. Use when reviewing changes for algorithmic complexity, I/O, memory, and caching.",
      mimeType: "text/markdown",
    },
  ];
}

/** Handle reading an MCP resource. */
export async function handleResourceRead(
  uri: string,
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  const projectPath = process.cwd();

  switch (uri) {
    // ─── JSON data resources ─────────────────────────────────
    case "kanban://board": {
      const data = await scanBoard(projectPath);
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
    case "kanban://tasks": {
      const data = await scanTasks(projectPath);
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
    case "kanban://prds": {
      const data = await scanPrds(projectPath);
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
    case "kanban://adrs": {
      const data = await scanAdrs(projectPath);
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }

    // ─── Review resources (Markdown) ─────────────────────────
    case "kanban://review/security":
      return { contents: [{ uri, mimeType: "text/markdown", text: SECURITY_REVIEW_MD }] };

    case "kanban://review/performance":
      return { contents: [{ uri, mimeType: "text/markdown", text: PERFORMANCE_REVIEW_MD }] };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
