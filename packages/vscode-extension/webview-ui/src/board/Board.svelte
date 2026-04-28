<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone, SOURCES, TRIGGERS, type DndEvent } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import type { Board, Column, InboundMessage, Task, TaskStatus } from "$lib/types";
  import { getVsCode, onMessage } from "$lib/vscode";
  import { demoBoard } from "$lib/demo-board";
  import TaskCard from "$lib/components/TaskCard.svelte";
  import Button from "$lib/components/ui/button.svelte";
  import Badge from "$lib/components/ui/badge.svelte";

  const vscode = getVsCode();
  let board = $state<Board>(demoBoard);
  let dragDisabled = $state(false);

  function refresh() {
    vscode.postMessage({ type: "refresh" });
  }

  function newTask() {
    vscode.postMessage({ type: "createTask" });
  }

  function handleConsider(status: TaskStatus, e: CustomEvent<DndEvent<Task>>) {
    const col = board.columns.find((c) => c.status === status);
    if (col) col.tasks = e.detail.items;
  }

  function handleFinalize(status: TaskStatus, e: CustomEvent<DndEvent<Task>>) {
    const col = board.columns.find((c) => c.status === status);
    if (!col) return;
    col.tasks = e.detail.items;

    const trigger = e.detail.info.trigger;
    if (trigger !== TRIGGERS.DROPPED_INTO_ZONE) return;
    if (e.detail.info.source !== SOURCES.POINTER && e.detail.info.source !== SOURCES.KEYBOARD)
      return;

    // The dropped card is identified by id; if its current status differs from
    // the column it landed in, tell the host to rename the file.
    const dropped = col.tasks.find((t) => t.id === e.detail.info.id);
    if (!dropped || dropped.status === status) return;
    vscode.postMessage({ type: "moveTask", taskId: dropped.id, newStatus: status });
  }

  onMount(() => {
    vscode.postMessage({ type: "refresh" });
    return onMessage<InboundMessage>((msg) => {
      if (msg.type === "boardUpdated") board = msg.board;
    });
  });
</script>

<div class="flex h-screen flex-col">
  <header class="flex items-center justify-between border-b border-border px-4 py-3">
    <div class="flex items-center gap-3">
      <h1 class="text-sm font-bold uppercase tracking-wider">Agent Kanban</h1>
      <span class="text-xs text-muted-foreground">{board.totalTasks} tasks</span>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" onclick={refresh}>↻ Refresh</Button>
      <Button size="sm" onclick={newTask}>+ New Task</Button>
    </div>
  </header>

  <div class="flex flex-1 gap-3 overflow-x-auto p-3">
    {#each board.columns as column (column.status)}
      <div class="flex w-72 shrink-0 flex-col rounded-md bg-muted/40">
        <div class="flex items-center justify-between border-b border-border px-3 py-2">
          <div class="flex items-center gap-2">
            <span
              class="h-2 w-2 rounded-full"
              style:background="var(--color-status-{column.status})"
            ></span>
            <span class="text-xs font-semibold uppercase tracking-wider">{column.label}</span>
          </div>
          <Badge tone={column.status}>{column.tasks.length}</Badge>
        </div>
        <div
          use:dndzone={{
            items: column.tasks,
            type: "task",
            dragDisabled,
            flipDurationMs: 200,
            dropTargetStyle: {
              outline: "2px dashed var(--color-ring)",
              outlineOffset: "-2px",
            },
          }}
          onconsider={(e) => handleConsider(column.status, e)}
          onfinalize={(e) => handleFinalize(column.status, e)}
          class="flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto p-2"
        >
          {#each column.tasks as task (task.id)}
            <div animate:flip={{ duration: 200 }}>
              <TaskCard {task} />
            </div>
          {:else}
            <div class="rounded border border-dashed border-border/50 px-3 py-6 text-center text-[11px] text-muted-foreground italic">
              No tasks
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
