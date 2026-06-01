<script lang="ts">
  import type { Task, TaskStatus } from "$lib/types";
  import { getVsCode } from "$lib/vscode";
  import { buildKanbanTaskRefFull } from "$lib/kanban-ref";
  import Badge from "$lib/components/ui/badge.svelte";
  import Button from "$lib/components/ui/button.svelte";

  interface Props {
    task: Task;
    copyProjectName?: string;
    onclose: () => void;
  }

  let { task, copyProjectName, onclose }: Props = $props();
  const vscode = getVsCode();

  const total = $derived(task.acceptance.length);
  const checked = $derived(task.acceptance.filter((a) => a.checked).length);
  const pct = $derived(total > 0 ? Math.round((checked / total) * 100) : 0);
  const title = $derived(task.goal || task.slug.replace(/-/g, " "));
  const copyOptions = $derived(
    copyProjectName ? { fallbackProjectName: copyProjectName } : undefined,
  );
  const kanbanRef = $derived(buildKanbanTaskRefFull(task, copyOptions));

  let copiedRef = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  function copyRef() {
    void navigator.clipboard.writeText(kanbanRef).then(() => {
      copiedRef = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copiedRef = false;
      }, 1200);
    });
  }

  const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "To Do",
    wip: "In Progress",
    verified: "Verified",
    done: "Done",
    blocked: "Blocked",
    achieved: "Achieved",
  };

  const STATUS_ICONS: Record<TaskStatus, string> = {
    todo: "○",
    wip: "◐",
    verified: "◉",
    done: "●",
    blocked: "✕",
    achieved: "★",
  };

  const STATUS_TRANSITIONS: Record<TaskStatus, { label: string; target: TaskStatus; icon: string }[]> = {
    todo: [
      { label: "Start Work", target: "wip", icon: "▶" },
      { label: "Block", target: "blocked", icon: "✕" },
    ],
    wip: [
      { label: "Submit for Review", target: "verified", icon: "✓" },
      { label: "Block", target: "blocked", icon: "✕" },
      { label: "Revert to Todo", target: "todo", icon: "←" },
    ],
    verified: [
      { label: "Mark Done", target: "done", icon: "✔" },
      { label: "Revert to WIP", target: "wip", icon: "←" },
    ],
    done: [
      { label: "Mark Achieved", target: "achieved", icon: "🏆" },
      { label: "Reopen", target: "todo", icon: "↺" },
    ],
    blocked: [
      { label: "Unblock → Todo", target: "todo", icon: "↺" },
      { label: "Unblock → WIP", target: "wip", icon: "▶" },
    ],
    achieved: [
      { label: "Revert to Done", target: "done", icon: "←" },
    ],
  };

  function moveTask(status: TaskStatus) {
    vscode.postMessage({ type: "moveTask", taskId: task.id, newStatus: status });
    onclose();
  }

  function openFile() {
    vscode.postMessage({ type: "openFile", filename: task.filename });
  }

  function featureLoop() {
    vscode.postMessage({ type: "startFeatureLoop", taskId: task.id });
  }

  function compoundLearnings() {
    vscode.postMessage({ type: "compoundLearnings", taskId: task.id });
  }

  function worktreeCreate() {
    vscode.postMessage({ type: "worktreeCreate", taskId: task.id });
  }

  function createPr() {
    vscode.postMessage({ type: "createPr", taskId: task.id });
  }

  function toggleAcceptance(index: number, currentChecked: boolean) {
    if (currentChecked) {
      vscode.postMessage({ type: "untickAcceptance", taskId: task.id, index });
    } else {
      vscode.postMessage({ type: "tickAcceptance", taskId: task.id, index });
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal-container" role="dialog" aria-modal="true" aria-label="Task detail">
    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="modal-header">
      <div class="header-left">
        <span class="task-id-label">#{task.id}</span>
        <Badge tone={task.status}>{STATUS_LABELS[task.status]}</Badge>
        {#if task.prdRef}
          <span class="prd-ref" title={task.prdRef}>📋 {task.prdRef.replace(/^docs\/prd\//, "").replace(/\.md$/, "")}</span>
        {/if}
      </div>
      <div class="header-right">
        <button class="icon-btn" onclick={copyRef} title="Copy {kanbanRef}">{copiedRef ? "✓" : "📋"}</button>
        <button class="icon-btn" onclick={openFile} title="Open in editor">📝</button>
        <button class="icon-btn close-btn" onclick={onclose} title="Close">✕</button>
      </div>
    </header>

    <!-- ── Body ────────────────────────────────────────────── -->
    <div class="modal-body">
      <!-- Main content area (left) -->
      <div class="modal-main">
        <h2 class="task-title">{title}</h2>

        {#if task.created}
          <div class="meta-line">
            <span class="meta-icon">📅</span>
            <span class="meta-text">Created {task.created}</span>
          </div>
        {/if}

        <!-- Acceptance Criteria -->
        {#if total > 0}
          <section class="section">
            <div class="section-header">
              <h3 class="section-title">Acceptance Criteria</h3>
              <div class="progress-info">
                <div class="progress-track-lg">
                  <div
                    class="progress-fill-lg progress-fill-{task.status}"
                    style:width="{pct}%"
                  ></div>
                </div>
                <span class="progress-label-lg">{checked}/{total} ({pct}%)</span>
              </div>
            </div>
            <ul class="criteria-list">
              {#each task.acceptance as item, i}
                <li class="criterion" class:checked={item.checked}>
                  <button
                    class="criterion-check"
                    onclick={() => toggleAcceptance(i, item.checked)}
                    title={item.checked ? "Untick" : "Tick"}
                  >
                    {#if item.checked}
                      <span class="check-icon done">✓</span>
                    {:else}
                      <span class="check-icon empty">○</span>
                    {/if}
                  </button>
                  <span class="criterion-text" class:line-through={item.checked}>{item.text}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <!-- Approach -->
        {#if task.approach && task.approach.length > 0}
          <section class="section">
            <h3 class="section-title">💡 Approach</h3>
            <ul class="bullet-list">
              {#each task.approach as item}
                <li>{item}</li>
              {/each}
            </ul>
          </section>
        {/if}

        <!-- Open Questions -->
        {#if task.openQuestions && task.openQuestions.length > 0}
          <section class="section">
            <h3 class="section-title">❓ Open Questions</h3>
            <ul class="bullet-list question-list">
              {#each task.openQuestions as item}
                <li>{item}</li>
              {/each}
            </ul>
          </section>
        {/if}

        <!-- Notes -->
        {#if task.notes && task.notes.length > 0}
          <section class="section">
            <h3 class="section-title">📝 Notes</h3>
            <ul class="bullet-list">
              {#each task.notes as item}
                <li>{item}</li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>

      <!-- Sidebar (right) -->
      <aside class="modal-sidebar">
        <!-- Status Transitions -->
        <div class="sidebar-section">
          <h4 class="sidebar-title">Status</h4>
          <div class="status-current">
            <span class="status-dot-lg status-dot-{task.status}">{STATUS_ICONS[task.status]}</span>
            <span>{STATUS_LABELS[task.status]}</span>
          </div>
          <div class="transition-actions">
            {#each STATUS_TRANSITIONS[task.status] as transition}
              <Button
                variant="outline"
                size="sm"
                class="w-full justify-start"
                onclick={() => moveTask(transition.target)}
              >
                <span class="transition-icon">{transition.icon}</span>
                {transition.label}
              </Button>
            {/each}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="sidebar-section">
          <h4 class="sidebar-title">Actions</h4>
          <div class="quick-actions">
            {#if task.status === "todo"}
              <Button variant="default" size="sm" class="w-full" onclick={featureLoop}>
                🚀 Feature Loop
              </Button>
            {/if}
            <Button variant="ghost" size="sm" class="w-full justify-start" onclick={worktreeCreate}>
              🌿 Create Worktree
            </Button>
            <Button variant="ghost" size="sm" class="w-full justify-start" onclick={createPr}>
              🔀 Create PR
            </Button>
            {#if task.status === "done"}
              <Button variant="ghost" size="sm" class="w-full justify-start" onclick={compoundLearnings}>
                🧠 Compound Learnings
              </Button>
            {/if}
            <Button variant="ghost" size="sm" class="w-full justify-start" onclick={openFile}>
              📄 Open Markdown
            </Button>
          </div>
        </div>

        <!-- Files Affected -->
        {#if task.filesAffected && task.filesAffected.length > 0}
          <div class="sidebar-section">
            <h4 class="sidebar-title">Files Affected</h4>
            <ul class="files-list">
              {#each task.filesAffected as file}
                <li class="file-item" title={file}>
                  <span class="file-icon">📄</span>
                  <span class="file-path">{file}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </aside>
    </div>
  </div>
</div>

<style>
  /* ── Backdrop & Container ──────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px 12px;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: backdrop-in 0.2s ease-out;
    overflow-y: auto;
  }

  .modal-container {
    width: 100%;
    max-width: 780px;
    max-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.4),
      0 0 0 1px color-mix(in srgb, var(--color-border) 30%, transparent);
    animation: modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  /* ── Header ────────────────────────────────────────────── */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 50%, transparent);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .task-id-label {
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--color-muted-foreground);
    font-weight: 600;
  }

  .prd-ref {
    font-size: 10px;
    color: var(--color-muted-foreground);
    padding: 2px 6px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .icon-btn:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
  }
  .close-btn:hover {
    background: var(--color-destructive);
    color: var(--color-destructive-foreground);
  }

  /* ── Body ──────────────────────────────────────────────── */
  .modal-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .modal-main {
    flex: 1;
    min-width: 0;
    padding: 16px;
    overflow-y: auto;
  }

  .modal-sidebar {
    width: 220px;
    flex-shrink: 0;
    padding: 16px;
    border-left: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 25%, transparent);
    overflow-y: auto;
  }

  /* ── Task Title ────────────────────────────────────────── */
  .task-title {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
    margin: 0 0 8px;
    color: var(--color-foreground);
  }

  .meta-line {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-muted-foreground);
    margin-bottom: 12px;
  }
  .meta-icon { font-size: 12px; }

  /* ── Sections ──────────────────────────────────────────── */
  .section {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  }
  .section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-foreground);
    margin: 0 0 8px;
  }
  .section-header .section-title {
    margin-bottom: 0;
  }

  /* ── Progress Bar ──────────────────────────────────────── */
  .progress-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-track-lg {
    width: 80px;
    height: 4px;
    border-radius: 99px;
    background: var(--color-muted);
    overflow: hidden;
  }

  .progress-fill-lg {
    height: 100%;
    border-radius: 99px;
    transition: width 0.3s ease;
  }
  .progress-fill-todo { background: var(--color-status-todo); }
  .progress-fill-wip { background: var(--color-status-wip); }
  .progress-fill-verified { background: var(--color-status-verified); }
  .progress-fill-done { background: var(--color-status-done); }
  .progress-fill-blocked { background: var(--color-status-blocked); }

  .progress-label-lg {
    font-size: 10px;
    color: var(--color-muted-foreground);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* ── Criteria List ─────────────────────────────────────── */
  .criteria-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .criterion {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    transition: background 0.12s ease;
  }
  .criterion:hover {
    background: var(--color-accent);
  }

  .criterion-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
    border: 1.5px solid var(--color-border);
    border-radius: 4px;
    background: none;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }
  .criterion-check:hover {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .check-icon {
    font-size: 11px;
    line-height: 1;
  }
  .check-icon.done {
    color: var(--color-status-done);
    font-weight: 700;
  }
  .check-icon.empty {
    color: var(--color-muted-foreground);
    font-size: 8px;
  }

  .criterion-text {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-foreground);
  }
  .criterion-text.line-through {
    text-decoration: line-through;
    opacity: 0.6;
  }

  /* ── Bullet Lists ──────────────────────────────────────── */
  .bullet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bullet-list li {
    position: relative;
    padding-left: 16px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-foreground);
  }
  .bullet-list li::before {
    content: "•";
    position: absolute;
    left: 4px;
    color: var(--color-muted-foreground);
  }
  .question-list li::before {
    content: "?";
    color: var(--color-status-wip);
    font-weight: 700;
  }

  /* ── Sidebar ───────────────────────────────────────────── */
  .sidebar-section {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  }
  .sidebar-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .sidebar-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted-foreground);
    margin: 0 0 8px;
  }

  .status-current {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--color-accent);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .status-dot-lg {
    font-size: 14px;
    line-height: 1;
  }
  .status-dot-todo { color: var(--color-status-todo); }
  .status-dot-wip { color: var(--color-status-wip); }
  .status-dot-verified { color: var(--color-status-verified); }
  .status-dot-done { color: var(--color-status-done); }
  .status-dot-blocked { color: var(--color-status-blocked); }

  .transition-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .transition-icon {
    font-size: 10px;
    margin-right: 2px;
  }

  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* ── Files List ────────────────────────────────────────── */
  .files-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 10px;
    color: var(--color-muted-foreground);
    transition: background 0.12s ease;
  }
  .file-item:hover {
    background: var(--color-accent);
  }

  .file-icon {
    font-size: 10px;
    flex-shrink: 0;
  }

  .file-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--vscode-editor-font-family, monospace);
  }

  /* ── Animations ────────────────────────────────────────── */
  @keyframes backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* ── Responsive ────────────────────────────────────────── */
  @media (max-width: 560px) {
    .modal-body {
      flex-direction: column;
    }
    .modal-sidebar {
      width: 100%;
      border-left: none;
      border-top: 1px solid var(--color-border);
    }
  }
</style>
