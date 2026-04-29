<script lang="ts">
  import type { Board, Column, Task, TaskStatus, WorkspaceInfo } from "$lib/types";
  import { getVsCode } from "$lib/vscode";
  import TaskCard from "$lib/components/TaskCard.svelte";
  import TaskDetailModal from "$lib/components/TaskDetailModal.svelte";
  import TaskCreateModal from "$lib/components/TaskCreateModal.svelte";
  import Badge from "$lib/components/ui/badge.svelte";
  import Button from "$lib/components/ui/button.svelte";

  let { board, workspaces = [] } = $props<{ board: Board; workspaces?: WorkspaceInfo[] }>();

  // Active workspace filter — empty set means "show all"
  // Initialize from the active flags sent by the extension
  let selectedPaths = $state<Set<string>>(
    workspaces.every(w => w.active !== false)
      ? new Set()
      : new Set(workspaces.filter(w => w.active).map(w => w.path)),
  );

  function selectAll() {
    selectedPaths = new Set();
    vscode.postMessage({ type: "setActiveWorkspaces", paths: workspaces.map(w => w.path) });
  }

  function toggleWorkspace(path: string) {
    const next = new Set(selectedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    // Empty selection → treat as "all"
    if (next.size === 0) {
      selectedPaths = new Set();
      vscode.postMessage({ type: "setActiveWorkspaces", paths: workspaces.map(w => w.path) });
    } else {
      selectedPaths = next;
      vscode.postMessage({ type: "setActiveWorkspaces", paths: Array.from(next) });
    }
  }

  const filteredColumns = $derived(
    selectedPaths.size === 0 || workspaces.length === 0
      ? board.columns
      : board.columns.map((col: Column): Column => ({
          ...col,
          tasks: col.tasks.filter((t: Task) => !t.projectRoot || selectedPaths.has(t.projectRoot)),
        }))
  );

  const vscode = getVsCode<{ open: Record<TaskStatus, boolean> }>();
  const persisted = vscode.getState();
  let open = $state<Record<TaskStatus, boolean>>(
    persisted?.open ?? { todo: true, wip: true, verified: false, done: false, blocked: false },
  );

  let selectedTask = $state<Task | null>(null);
  let showCreateModal = $state(false);

  function toggle(status: TaskStatus) {
    open[status] = !open[status];
    vscode.setState({ open });
  }

  function createTask() {
    showCreateModal = true;
  }

  function openDetail(task: Task) {
    selectedTask = task;
  }

  function closeDetail() {
    selectedTask = null;
  }

  const STATUS_ICONS: Record<TaskStatus, string> = {
    todo: "○",
    wip: "◐",
    verified: "◉",
    done: "●",
    blocked: "✕",
  };
</script>

<div class="kanban-root">
  <!-- Quick-action row -->
  <div class="kanban-actions">
    <Button variant="default" size="sm" class="w-full" onclick={createTask}>
      + New Task
    </Button>
  </div>

  <!-- Workspace filter chips (multi-root only) -->
  {#if workspaces.length > 1}
    <div class="ws-filter">
      <button class="ws-chip" class:ws-active={selectedPaths.size === 0} onclick={selectAll}>All</button>
      {#each workspaces as ws (ws.path)}
        <button
          class="ws-chip"
          class:ws-active={selectedPaths.has(ws.path)}
          onclick={() => toggleWorkspace(ws.path)}
          title={ws.path}
        >{ws.name}</button>
      {/each}
    </div>
  {/if}

  <!-- Columns -->
  {#each filteredColumns as column (column.status)}
    {@const isOpen = open[column.status]}
    {@const count = column.tasks.length}
    <section class="column" class:has-tasks={count > 0}>
      <button class="column-header" onclick={() => toggle(column.status)}>
        <div class="column-left">
          <span class="chevron" class:rotated={isOpen}>›</span>
          <span class="status-dot status-dot-{column.status}">{STATUS_ICONS[column.status]}</span>
          <span class="column-title">{column.label}</span>
        </div>
        <Badge tone={column.status}>{count}</Badge>
      </button>

      {#if isOpen}
        <div class="column-body" style="animation: var(--animate-fade-in)">
          {#each column.tasks as task (task.id)}
            <TaskCard {task} onviewdetail={openDetail} />
          {:else}
            <div class="empty-col">
              <span class="empty-icon">{STATUS_ICONS[column.status]}</span>
              <span>No {column.label.toLowerCase()} tasks</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/each}
</div>

<!-- Task Detail Modal (Jira-style) -->
{#if selectedTask}
  <TaskDetailModal task={selectedTask} onclose={closeDetail} />
{/if}

<!-- Task Create Modal -->
{#if showCreateModal}
  <TaskCreateModal onclose={() => showCreateModal = false} />
{/if}

<style>
  .kanban-root {
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
  }

  .kanban-actions {
    padding: 0 0 8px;
  }

  .column {
    border-radius: 6px;
    overflow: hidden;
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--color-foreground);
    cursor: pointer;
    transition: background 0.12s ease;
    font-family: inherit;
    text-align: left;
  }
  .column-header:hover {
    background: var(--color-accent);
  }

  .column-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chevron {
    font-size: 11px;
    color: var(--color-muted-foreground);
    transition: transform 0.15s ease;
    display: inline-block;
    width: 10px;
    text-align: center;
  }
  .chevron.rotated {
    transform: rotate(90deg);
  }

  .status-dot {
    font-size: 10px;
    line-height: 1;
  }
  .status-dot-todo { color: var(--color-status-todo); }
  .status-dot-wip { color: var(--color-status-wip); }
  .status-dot-verified { color: var(--color-status-verified); }
  .status-dot-done { color: var(--color-status-done); }
  .status-dot-blocked { color: var(--color-status-blocked); }

  .column-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .column-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 4px 8px 20px;
  }

  .empty-col {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    font-size: 11px;
    color: var(--color-muted-foreground);
    font-style: italic;
    border: 1px dashed var(--color-border);
    border-radius: 6px;
  }
  .empty-icon {
    opacity: 0.4;
    font-style: normal;
  }

  .ws-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 0 8px;
  }

  .ws-chip {
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-muted-foreground);
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s ease;
    white-space: nowrap;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ws-chip:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
  }
  .ws-chip.ws-active {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-color: var(--color-primary);
  }
</style>
