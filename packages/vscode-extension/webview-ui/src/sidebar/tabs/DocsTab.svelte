<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import type { DocsData } from "$lib/types";
  import Badge from "$lib/components/ui/badge.svelte";

  let { docs = { prds: [], adrs: [], tasks: [] } } = $props<{ docs: DocsData }>();
  const vscode = getVsCode<{ activeDocSub?: "prd" | "adr" | "task" }>();

  let activeSub = $state<"prd" | "adr" | "task">(
    vscode.getState()?.activeDocSub || "prd",
  );

  const SUBS = [
    { id: "prd" as const, label: "PRDs", icon: "📝" },
    { id: "adr" as const, label: "ADRs", icon: "📐" },
    { id: "task" as const, label: "Tasks", icon: "✅" },
  ];

  function switchSub(sub: "prd" | "adr" | "task") {
    activeSub = sub;
    vscode.setState({ ...vscode.getState(), activeDocSub: sub });
  }

  function openDoc(type: "prd" | "adr" | "task", doc: { filename: string; projectRoot?: string }) {
    vscode.postMessage({
      type: type === "prd" ? "openPrd" : type === "adr" ? "openAdr" : "openFile",
      filename: doc.filename,
      projectRoot: doc.projectRoot,
    });
  }

  function subCount(id: string) {
    if (id === "prd") return docs.prds.length;
    if (id === "adr") return docs.adrs.length;
    return docs.tasks.length;
  }
</script>

<div class="docs-root">
  <!-- Sub-tabs -->
  <div class="sub-tabs">
    {#each SUBS as sub (sub.id)}
      {@const active = activeSub === sub.id}
      {@const count = subCount(sub.id)}
      <button class="sub-tab" class:active onclick={() => switchSub(sub.id)}>
        <span class="sub-icon">{sub.icon}</span>
        <span>{sub.label}</span>
        {#if count > 0}
          <span class="sub-count">{count}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Doc list -->
  <div class="doc-list" style="animation: var(--animate-fade-in)">
    {#if activeSub === "prd"}
      {#each docs.prds as doc}
        <button class="doc-card" onclick={() => openDoc("prd", doc)}>
          <div class="doc-icon-col">📝</div>
          <div class="doc-body">
            <span class="doc-title">{doc.title}</span>
            {#if doc.status}
              <span class="doc-meta">{doc.status}</span>
            {/if}
            {#if doc.summary}
              <span class="doc-summary">{doc.summary}</span>
            {/if}
          </div>
        </button>
      {:else}
        <div class="empty-state">
          <span class="empty-emoji">📝</span>
          <span class="empty-title">No PRDs yet</span>
          <span class="empty-hint">Create one via the Workflow tab</span>
        </div>
      {/each}
    {:else if activeSub === "adr"}
      {#each docs.adrs as doc}
        <button class="doc-card" onclick={() => openDoc("adr", doc)}>
          <div class="doc-icon-col">📐</div>
          <div class="doc-body">
            <span class="doc-title">{doc.title}</span>
          </div>
        </button>
      {:else}
        <div class="empty-state">
          <span class="empty-emoji">📐</span>
          <span class="empty-title">No ADRs yet</span>
          <span class="empty-hint">Architectural decisions will appear here</span>
        </div>
      {/each}
    {:else}
      {#each docs.tasks as doc}
        <button class="doc-card" onclick={() => openDoc("task", doc)}>
          <div class="doc-icon-col">✅</div>
          <div class="doc-body">
            <span class="doc-title">{doc.title}</span>
            {#if doc.status}
              <span class="doc-status-badge doc-status-{doc.status}">{doc.status}</span>
            {/if}
          </div>
        </button>
      {:else}
        <div class="empty-state">
          <span class="empty-emoji">✅</span>
          <span class="empty-title">No task docs yet</span>
          <span class="empty-hint">Tasks appear when created via Kanban</span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .docs-root {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ── Sub-tab row ──────────────────────────────────────── */
  .sub-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 30%, transparent);
  }

  .sub-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 4px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
  }
  .sub-tab:hover {
    color: var(--color-foreground);
    background: var(--color-accent);
  }
  .sub-tab.active {
    color: var(--color-foreground);
    border-bottom-color: var(--color-primary);
  }

  .sub-icon { font-size: 12px; }

  .sub-count {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 99px;
    background: var(--color-muted);
    font-size: 9px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }

  /* ── Doc list ─────────────────────────────────────────── */
  .doc-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .doc-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.12s ease;
    text-align: left;
    font-family: inherit;
    color: inherit;
  }
  .doc-card:hover {
    border-color: var(--color-ring);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ring) 12%, transparent);
  }

  .doc-icon-col {
    font-size: 16px;
    line-height: 1;
    padding-top: 1px;
  }

  .doc-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .doc-title {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .doc-meta {
    font-size: 10px;
    color: var(--color-muted-foreground);
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .doc-summary {
    font-size: 11px;
    color: var(--color-muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-status-badge {
    display: inline-block;
    margin-top: 2px;
    padding: 1px 6px;
    border-radius: 99px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    width: fit-content;
  }
  .doc-status-todo { background: color-mix(in srgb, var(--color-status-todo) 15%, transparent); color: var(--color-status-todo); }
  .doc-status-wip { background: color-mix(in srgb, var(--color-status-wip) 15%, transparent); color: var(--color-status-wip); }
  .doc-status-done { background: color-mix(in srgb, var(--color-status-done) 15%, transparent); color: var(--color-status-done); }
  .doc-status-blocked { background: color-mix(in srgb, var(--color-status-blocked) 15%, transparent); color: var(--color-status-blocked); }

  /* ── Empty state ──────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    gap: 6px;
    color: var(--color-muted-foreground);
  }
  .empty-emoji { font-size: 28px; opacity: 0.4; }
  .empty-title { font-size: 12px; font-weight: 600; }
  .empty-hint { font-size: 10px; opacity: 0.6; }
</style>
