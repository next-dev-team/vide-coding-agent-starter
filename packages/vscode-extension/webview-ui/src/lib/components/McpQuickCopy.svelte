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

  /** Full MCP catalog for quick discoverability and copy from the board header. */
  const MCP_TOOL_CATALOG = [
    { id: "project_list", desc: "List workspace projects and Kanban roots" },
    { id: "board_list", desc: "List tasks grouped by Kanban status" },
    { id: "task_create", desc: "Create a new task from template" },
    { id: "task_read", desc: "Read a task by ID" },
    { id: "task_update", desc: "Tick or untick criteria, add notes" },
    { id: "task_move", desc: "Move task between statuses" },
    { id: "next_id", desc: "Get next available sequential ID" },
    { id: "prd_create", desc: "Create a new PRD from template" },
    { id: "prd_list", desc: "List all PRDs with status" },
    { id: "adr_create", desc: "Create an architectural decision record" },
    { id: "memory_overview", desc: "List all memories by category (L0)" },
    { id: "memory_find", desc: "Search memories by text" },
    { id: "memory_read", desc: "Read full L2 content of a memory" },
    { id: "memory_session", desc: "View session memory access log" },
    { id: "memory_dedupe", desc: "Run memory deduplication sweep" },
    { id: "memory_config_set", desc: "Switch memory backend" },
    { id: "compound_learnings", desc: "Extract learnings from a done task" },
    { id: "worktree_create", desc: "Create git worktree for a task" },
    { id: "worktree_cleanup", desc: "Remove a task worktree" },
    { id: "pr_create", desc: "Create a GitHub draft PR" },
    { id: "feature_loop", desc: "Generate full feature orchestration plan" },
    { id: "agents_generate", desc: "Scan repository and generate AGENTS.md" },
    { id: "project_sync_all", desc: "Audit PRDs, tasks, code, docs, and memory" },
  ] as const;

  let copiedId = $state<string | null>(null);
  let copiedCatalogId = $state<string | null>(null);
  let showCatalogDialog = $state(false);
  let toolSearch = $state("");
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  function toolName(tool: (typeof DAILY_MCP_TOOLS)[number]): string {
    return tool.id === "sync_all" ? "project_sync_all" : tool.label;
  }

  /** e.g. `kanban mpos-mall-pc-frontend task_create` or `kanban task_create`. */
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

  const filteredCatalog = $derived.by(() => {
    const q = toolSearch.trim().toLowerCase();
    if (!q) return MCP_TOOL_CATALOG;
    return MCP_TOOL_CATALOG.filter((tool) => {
      return tool.id.toLowerCase().includes(q) || tool.desc.toLowerCase().includes(q);
    });
  });

  function openCatalogDialog() {
    showCatalogDialog = true;
  }

  function closeCatalogDialog() {
    showCatalogDialog = false;
    toolSearch = "";
  }

  function copyCatalogTool(toolId: string) {
    void navigator.clipboard.writeText(toolId).then(() => {
      copiedCatalogId = toolId;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copiedCatalogId = null;
      }, 1200);
    });
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("mcp-dialog-backdrop")) {
      closeCatalogDialog();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && showCatalogDialog) closeCatalogDialog();
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      closeCatalogDialog();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mcp-quick">
  <span class="mcp-quick-label" title="Click to copy MCP tool name for your agent">MCP</span>
  <button
    type="button"
    class="mcp-icon-btn"
    title="Open full MCP tools list"
    aria-label="Open full MCP tools list"
    onclick={openCatalogDialog}
  >
    i
  </button>
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

{#if showCatalogDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="mcp-dialog-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close MCP tools dialog"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div class="mcp-dialog" role="dialog" aria-modal="true" aria-label="MCP tools catalog">
      <header class="mcp-dialog-header">
        <h3>MCP Tools ({MCP_TOOL_CATALOG.length})</h3>
        <button type="button" class="mcp-icon-btn mcp-close-btn" onclick={closeCatalogDialog} title="Close">
          x
        </button>
      </header>
      <div class="mcp-dialog-controls">
        <input
          type="text"
          class="mcp-search"
          placeholder="Search tools..."
          bind:value={toolSearch}
          aria-label="Search MCP tools"
        />
      </div>
      <div class="mcp-dialog-list">
        {#if filteredCatalog.length === 0}
          <p class="mcp-empty">No tools match your search.</p>
        {:else}
          {#each filteredCatalog as tool (tool.id)}
            <div class="mcp-tool-row">
              <div class="mcp-tool-copy-cell">
                <code>{tool.id}</code>
                <button
                  type="button"
                  class="mcp-copy-btn"
                  onclick={() => copyCatalogTool(tool.id)}
                  title="Copy {tool.id}"
                >
                  {copiedCatalogId === tool.id ? "Copied" : "Copy"}
                </button>
              </div>
              <p>{tool.desc}</p>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

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

  .mcp-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-muted) 35%, transparent);
    color: var(--color-muted-foreground);
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .mcp-icon-btn:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
    border-color: var(--color-accent);
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

  .mcp-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 20px 10px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .mcp-dialog {
    width: 100%;
    max-width: 680px;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-background);
    box-shadow: 0 18px 56px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  .mcp-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 45%, transparent);
  }

  .mcp-dialog-header h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
  }

  .mcp-close-btn {
    border-radius: 6px;
    width: 20px;
    height: 20px;
    font-size: 10px;
  }

  .mcp-dialog-controls {
    padding: 8px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  }

  .mcp-search {
    width: 100%;
    padding: 6px 9px;
    border: 1px solid var(--color-border);
    border-radius: 7px;
    background: color-mix(in srgb, var(--color-muted) 25%, transparent);
    color: var(--color-foreground);
    font-size: 11px;
    outline: none;
  }

  .mcp-search:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  .mcp-dialog-list {
    overflow: auto;
    padding: 8px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mcp-tool-row {
    border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
    border-radius: 8px;
    padding: 7px 8px;
    background: color-mix(in srgb, var(--color-muted) 18%, transparent);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mcp-tool-copy-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .mcp-tool-copy-cell code {
    font-size: 11px;
    color: var(--color-foreground);
  }

  .mcp-copy-btn {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: transparent;
    color: var(--color-muted-foreground);
    font-size: 10px;
    font-weight: 600;
    padding: 3px 7px;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .mcp-copy-btn:hover {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-foreground);
  }

  .mcp-tool-row p {
    margin: 0;
    color: var(--color-muted-foreground);
    font-size: 10px;
    line-height: 1.4;
  }

  .mcp-empty {
    margin: 4px 0;
    font-size: 10px;
    color: var(--color-muted-foreground);
  }
</style>
