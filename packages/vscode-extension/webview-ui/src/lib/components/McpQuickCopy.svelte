<script lang="ts">
  let { projectNames = [] } = $props<{ projectNames?: string[] }>();

  /** Daily agent-kanban MCP tool names for one-click copy into chat. */
  const DAILY_MCP_TOOLS = [
    { id: "project_list", label: "project_list", hint: "List workspace / monorepo projects and Kanban roots" },
    { id: "board_list", label: "board_list", hint: "List Kanban columns and tasks" },
    { id: "prd_create", label: "prd_create", hint: "Create a PRD in docs/prd/" },
    { id: "task_create", label: "task_create", hint: "Create a task in docs/tasks/" },
    { id: "task_move", label: "task_move", hint: "Move a task to another status" },
    { id: "prd_list", label: "prd_list", hint: "List all PRDs" },
    { id: "sync_all", label: "sync_all", hint: "Audit PRDs, tasks, code, docs, memory" },
  ] as const;

  let copiedId = $state<string | null>(null);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  function toolName(tool: (typeof DAILY_MCP_TOOLS)[number]): string {
    return tool.id === "sync_all" ? "project_sync_all" : tool.label;
  }

  /** e.g. `kanban mpos-mall-pc-frontend task_create` or `kanban task_create` when All. */
  function buildCopyText(tool: (typeof DAILY_MCP_TOOLS)[number]): string {
    const name = toolName(tool);
    if (projectNames.length === 0) return `kanban ${name}`;
    return `kanban ${projectNames.join(" ")} ${name}`;
  }

  function copyText(tool: (typeof DAILY_MCP_TOOLS)[number]) {
    const text = buildCopyText(tool);
    void navigator.clipboard.writeText(text).then(() => {
      copiedId = tool.id;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copiedId = null;
      }, 1200);
    });
  }
</script>

<div class="mcp-quick">
  <span class="mcp-quick-label" title="Click to copy MCP tool name for your agent">MCP</span>
  <div class="mcp-chips" role="group" aria-label="Daily MCP tools">
    {#each DAILY_MCP_TOOLS as tool (tool.id)}
      <button
        type="button"
        class="mcp-chip"
        class:mcp-copied={copiedId === tool.id}
        onclick={() => copyText(tool)}
        title={`${buildCopyText(tool)} — ${tool.hint}`}
      >
        {copiedId === tool.id ? "✓" : tool.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .mcp-quick {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 0 0 6px;
  }

  .mcp-quick-label {
    flex-shrink: 0;
    margin-top: 3px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted-foreground);
  }

  .mcp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .mcp-chip {
    padding: 2px 7px;
    border-radius: 99px;
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 35%, transparent);
    color: var(--color-muted-foreground);
    font-size: 9px;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    cursor: pointer;
    transition: all 0.12s ease;
    white-space: nowrap;
  }

  .mcp-chip:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
    border-color: var(--color-accent);
  }

  .mcp-chip.mcp-copied {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-color: var(--color-primary);
  }
</style>
