<script lang="ts">
  import type { Board, TaskStatus } from "$lib/types";
  import { getVsCode } from "$lib/vscode";
  import TaskCard from "$lib/components/TaskCard.svelte";
  import Badge from "$lib/components/ui/badge.svelte";
  import Button from "$lib/components/ui/button.svelte";

  let { board } = $props<{ board: Board }>();

  const vscode = getVsCode<{ open: Record<TaskStatus, boolean> }>();
  const persisted = vscode.getState();
  let open = $state<Record<TaskStatus, boolean>>(
    persisted?.open ?? { todo: true, wip: true, verified: false, done: false, blocked: false },
  );

  function toggle(status: TaskStatus) {
    open[status] = !open[status];
    vscode.setState({ open });
  }

  function createTask() {
    vscode.postMessage({ type: "createTask" });
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

  <!-- Columns -->
  {#each board.columns as column (column.status)}
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
            <TaskCard {task} />
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
</style>
