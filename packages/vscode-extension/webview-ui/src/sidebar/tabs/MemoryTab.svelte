<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import { onMount, onDestroy } from "svelte";

  interface MemoryEntry {
    filePath: string;
    tierLoaded: string;
    tokensUsed: number;
    fullTokenCount: number;
    loadedAt?: string;
  }

  const vscode = getVsCode<{}>();

  let entries = $state<MemoryEntry[]>([]);
  let summary = $state<{
    totalTokensUsed?: number;
    totalTokensSaved?: number;
    filesAccessed?: number;
  }>({});

  function clearSession() { vscode.postMessage({ type: "clearSession" }); }

  let listener: ((event: MessageEvent) => void) | null = null;
  onMount(() => {
    listener = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === "sessionSnapshot") {
        entries = msg.entries || [];
        summary = msg.summary || {};
      }
    };
    window.addEventListener("message", listener);
  });
  onDestroy(() => {
    if (listener) window.removeEventListener("message", listener);
  });

  const TIER_CONFIG: Record<string, { color: string; label: string }> = {
    L0: { color: "var(--color-status-done)", label: "Abstract" },
    L1: { color: "var(--color-status-wip)", label: "Summary" },
    L2: { color: "var(--color-status-blocked)", label: "Full" },
  };
</script>

<div class="mem-root">
  <!-- ── Stats ──────────────────────────────────────────── -->
  <div class="stats-row">
    <div class="stat-card">
      <span class="stat-value">{summary.totalTokensUsed || 0}</span>
      <span class="stat-label">Tokens Sent</span>
    </div>
    <div class="stat-card saved">
      <span class="stat-value">+{summary.totalTokensSaved || 0}</span>
      <span class="stat-label">Saved</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{entries.length}</span>
      <span class="stat-label">Files</span>
    </div>
  </div>

  <!-- ── Tier Legend ────────────────────────────────────── -->
  <div class="tier-legend">
    {#each Object.entries(TIER_CONFIG) as [tier, cfg]}
      <div class="tier-item">
        <span class="tier-dot" style:background={cfg.color}></span>
        <span class="tier-name">{tier}</span>
        <span class="tier-desc">{cfg.label}</span>
      </div>
    {/each}
    <div class="flex-1"></div>
    <button class="clear-btn" onclick={clearSession}>Clear</button>
  </div>

  <!-- ── Entries ────────────────────────────────────────── -->
  <div class="entries-list">
    {#if entries.length === 0}
      <div class="empty-state">
        <div class="empty-brain">🧠</div>
        <span class="empty-title">Memory Engine Idle</span>
        <span class="empty-hint">Memories load as agents access them.<br/>L0 abstracts save the most tokens.</span>
      </div>
    {:else}
      {#each entries as entry, i}
        {@const cfg = TIER_CONFIG[entry.tierLoaded] || { color: "var(--color-muted-foreground)", label: "?" }}
        {@const saved = entry.fullTokenCount - entry.tokensUsed}
        {@const filename = entry.filePath.split(/[\\/]/).pop() || entry.filePath}
        <div class="entry-row" style="animation: var(--animate-fade-in); animation-delay: {i * 30}ms; animation-fill-mode: both">
          <div class="entry-tier" style:background={cfg.color}>{entry.tierLoaded}</div>
          <div class="entry-body">
            <span class="entry-name" title={entry.filePath}>{filename}</span>
            <div class="entry-stats">
              <span class="entry-tokens">{entry.tokensUsed} tok</span>
              {#if saved > 0}
                <span class="entry-saved" style:color="var(--color-status-done)">+{saved} saved</span>
              {/if}
            </div>
          </div>
          <!-- Token savings bar -->
          <div class="savings-bar-track">
            <div
              class="savings-bar-fill"
              style:width="{Math.round((entry.tokensUsed / Math.max(entry.fullTokenCount, 1)) * 100)}%"
              style:background={cfg.color}
            ></div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .mem-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 8px;
    gap: 8px;
  }

  /* ── Stats row ────────────────────────────────────────── */
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 4px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
  }
  .stat-card.saved {
    background: color-mix(in srgb, var(--color-status-done) 8%, var(--color-card));
    border-color: color-mix(in srgb, var(--color-status-done) 25%, transparent);
  }
  .stat-card.saved .stat-value {
    color: var(--color-status-done);
  }

  .stat-value {
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .stat-label {
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted-foreground);
  }

  /* ── Tier legend ──────────────────────────────────────── */
  .tier-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
  }
  .tier-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .tier-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .tier-name {
    font-size: 9px;
    font-weight: 700;
  }
  .tier-desc {
    font-size: 9px;
    color: var(--color-muted-foreground);
    display: none; /* show on wider viewports if needed */
  }

  .clear-btn {
    padding: 2px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 9px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
  }
  .clear-btn:hover {
    border-color: var(--color-ring);
    color: var(--color-foreground);
  }

  /* ── Entries list ─────────────────────────────────────── */
  .entries-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .entry-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    position: relative;
    overflow: hidden;
  }

  .entry-tier {
    min-width: 22px;
    height: 18px;
    padding: 0 4px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 800;
    line-height: 18px;
    text-align: center;
    color: var(--color-background);
  }

  .entry-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .entry-name {
    font-size: 11px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entry-stats {
    display: flex;
    gap: 8px;
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  .entry-tokens { color: var(--color-muted-foreground); }
  .entry-saved { font-weight: 600; }

  /* Token usage mini-bar */
  .savings-bar-track {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: color-mix(in srgb, var(--color-border) 30%, transparent);
  }
  .savings-bar-fill {
    height: 100%;
    transition: width 0.3s ease;
    opacity: 0.6;
  }

  /* ── Empty state ──────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    gap: 8px;
    color: var(--color-muted-foreground);
    text-align: center;
  }
  .empty-brain {
    font-size: 36px;
    opacity: 0.3;
    animation: var(--animate-pulse-subtle);
  }
  .empty-title { font-size: 12px; font-weight: 600; }
  .empty-hint { font-size: 10px; opacity: 0.6; line-height: 1.5; }
  .flex-1 { flex: 1; }
</style>
