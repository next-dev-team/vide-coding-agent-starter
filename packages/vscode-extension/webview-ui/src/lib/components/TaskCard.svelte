<script lang="ts">
  import type { Task } from "$lib/types";
  import { getVsCode } from "$lib/vscode";
  import Badge from "$lib/components/ui/badge.svelte";

  interface Props {
    task: Task;
    onviewdetail?: (task: Task) => void;
  }

  let { task, onviewdetail }: Props = $props();
  const vscode = getVsCode();

  const total = $derived(task.acceptance.length);
  const checked = $derived(task.acceptance.filter((a) => a.checked).length);
  const pct = $derived(total > 0 ? Math.round((checked / total) * 100) : 0);
  const title = $derived(task.goal || task.slug.replace(/-/g, " "));

  function open() {
    if (onviewdetail) {
      onviewdetail(task);
    } else {
      vscode.postMessage({ type: "openFile", filename: task.filename });
    }
  }

  function moveTask(status: string) {
    vscode.postMessage({ type: "moveTask", taskId: task.id, newStatus: status });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="task-card" onclick={open} role="button" tabindex="0">
  <div class="task-top">
    <span class="task-id">#{task.id}</span>
    <Badge tone={task.status}>{task.status}</Badge>
  </div>
  <div class="task-title">{title}</div>
  {#if total > 0}
    <div class="task-progress">
      <div class="progress-track">
        <div
          class="progress-fill progress-fill-{task.status}"
          style:width="{pct}%"
        ></div>
      </div>
      <span class="progress-label">{checked}/{total}</span>
    </div>
  {/if}
  <!-- Quick-move actions -->
  <div class="task-actions">
    {#if task.status === "todo"}
      <button type="button" class="action-btn rocket" onclick={(e) => { e.stopPropagation(); vscode.postMessage({ type: "startFeatureLoop", taskId: task.id }); }} title="Feature Loop">🚀</button>
    {/if}
    {#if task.status !== "wip"}
      <button type="button" class="action-btn" onclick={(e) => { e.stopPropagation(); moveTask("wip"); }} title="Start">▶</button>
    {/if}
    {#if task.status === "wip"}
      <button type="button" class="action-btn" onclick={(e) => { e.stopPropagation(); moveTask("verified"); }} title="Verify">✓</button>
    {/if}
    {#if task.status === "verified"}
      <button type="button" class="action-btn" onclick={(e) => { e.stopPropagation(); moveTask("done"); }} title="Done">✔</button>
    {/if}
    {#if task.status === "done"}
      <button type="button" class="action-btn" onclick={(e) => { e.stopPropagation(); vscode.postMessage({ type: "compoundLearnings", taskId: task.id }); }} title="Compound Learnings">🧠</button>
    {/if}
  </div>
</div>

<style>
  .task-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    color: var(--color-card-foreground);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    font-family: inherit;
  }
  .task-card:hover {
    border-color: var(--color-ring);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ring) 15%, transparent);
    transform: translateY(-1px);
  }

  .task-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .task-id {
    font-size: 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--color-muted-foreground);
  }

  .task-title {
    font-size: 12px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .task-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  .progress-track {
    flex: 1;
    height: 3px;
    border-radius: 99px;
    background: var(--color-muted);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.3s ease;
  }
  .progress-fill-todo { background: var(--color-status-todo); }
  .progress-fill-wip { background: var(--color-status-wip); }
  .progress-fill-verified { background: var(--color-status-verified); }
  .progress-fill-done { background: var(--color-status-done); }
  .progress-fill-blocked { background: var(--color-status-blocked); }

  .progress-label {
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--color-muted-foreground);
  }

  /* Quick-move actions — show on hover */
  .task-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: none;
    gap: 2px;
  }
  .task-card:hover .task-actions {
    display: flex;
  }
  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    font-size: 10px;
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    cursor: pointer;
    transition: opacity 0.1s;
  }
  .action-btn:hover {
    opacity: 0.85;
  }
</style>
