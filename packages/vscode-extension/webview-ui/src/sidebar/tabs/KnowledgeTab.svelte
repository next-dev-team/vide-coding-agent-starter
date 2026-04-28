<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import { onMount, onDestroy } from "svelte";

  interface KnowledgeMemory { id: number; category: string; slug: string; abstract: string; tokenCount: number; }
  interface KnowledgeData { brainContent: string; brainExists: boolean; memories: KnowledgeMemory[]; categories: Record<string, number>; totalMemories: number; }
  interface MemEntry { filePath: string; tierLoaded: string; tokensUsed: number; fullTokenCount: number; }

  let { knowledge = { brainContent: "", brainExists: false, memories: [], categories: {}, totalMemories: 0 } } = $props<{ knowledge: KnowledgeData }>();
  const vscode = getVsCode<{ knowledgeSub?: string }>();

  let activeSub = $state<string>(vscode.getState()?.knowledgeSub || "brain");
  let filterCat = $state<string>("all");
  let searchQuery = $state("");
  let entries = $state<MemEntry[]>([]);
  let summary = $state<{ totalTokensUsed?: number; totalTokensSaved?: number }>({});

  function switchSub(s: string) { activeSub = s; vscode.setState({ ...vscode.getState(), knowledgeSub: s }); }
  function syncBrain() { vscode.postMessage({ type: "syncBrain" }); }
  function openBrain() { vscode.postMessage({ type: "openBrain" }); }
  function readMemory(id: number) { vscode.postMessage({ type: "readMemory", memoryId: String(id) }); }
  function searchMemories() { if (searchQuery.trim()) vscode.postMessage({ type: "findMemory", query: searchQuery.trim() }); }
  function clearSession() { vscode.postMessage({ type: "clearSession" }); }

  let filtered = $derived(
    knowledge.memories.filter(m => (filterCat === "all" || m.category === filterCat) && (!searchQuery || m.abstract.toLowerCase().includes(searchQuery.toLowerCase()) || m.slug.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const CAT_ICONS: Record<string, string> = { tech_stack: "🔧", architecture: "🏗", workflow: "🔄", code_style: "🎨", domain: "📦", bugs: "🐛", performance: "⚡", security: "🔒" };
  const TIER_COLORS: Record<string, string> = { L0: "var(--color-status-done)", L1: "var(--color-status-wip)", L2: "var(--color-status-blocked)" };

  let listener: ((e: MessageEvent) => void) | null = null;
  onMount(() => { listener = (e: MessageEvent) => { if (e.data?.type === "sessionSnapshot") { entries = e.data.entries || []; summary = e.data.summary || {}; } }; window.addEventListener("message", listener); });
  onDestroy(() => { if (listener) window.removeEventListener("message", listener); });
</script>

<div class="k-root">
  <div class="sub-tabs">
    {#each [{ id: "brain", icon: "🧠", label: "Brain" }, { id: "memories", icon: "📚", label: "Memories" }, { id: "session", icon: "📊", label: "Session" }] as tab}
      <button class="sub-tab" class:active={activeSub === tab.id} onclick={() => switchSub(tab.id)}>
        <span>{tab.icon}</span><span>{tab.label}</span>
        {#if tab.id === "memories" && knowledge.totalMemories}<span class="sub-count">{knowledge.totalMemories}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="k-content" style="animation: var(--animate-fade-in)">
    {#if activeSub === "brain"}
      <!-- PROJECT BRAIN -->
      <div class="brain-section">
        <div class="brain-actions">
          <button class="k-btn primary" onclick={syncBrain}>🔄 Sync Brain</button>
          {#if knowledge.brainExists}<button class="k-btn" onclick={openBrain}>📄 Open File</button>{/if}
        </div>
        {#if knowledge.brainExists && knowledge.brainContent}
          <div class="brain-preview">
            {#each knowledge.brainContent.split("\n") as line}
              {#if line.startsWith("# ")}<h2 class="bp-h1">{line.slice(2)}</h2>
              {:else if line.startsWith("## ")}<h3 class="bp-h2">{line.slice(3)}</h3>
              {:else if line.startsWith("> ")}<p class="bp-quote">{line.slice(2)}</p>
              {:else if line.startsWith("- ")}<div class="bp-item">{line.slice(2)}</div>
              {:else if line.trim()}<p class="bp-text">{line}</p>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <span class="empty-emoji">🧠</span>
            <span class="empty-title">No Project Brain yet</span>
            <span class="empty-hint">Click <strong>Sync Brain</strong> to generate from memories</span>
          </div>
        {/if}
        <!-- Category overview -->
        {#if Object.keys(knowledge.categories).length > 0}
          <div class="cat-grid">
            {#each Object.entries(knowledge.categories) as [cat, count]}
              <button class="cat-chip" onclick={() => { filterCat = cat; switchSub("memories"); }}>
                <span class="cat-icon">{CAT_ICONS[cat] || "📁"}</span>
                <span class="cat-name">{cat.replace("_", " ")}</span>
                <span class="cat-count">{count}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeSub === "memories"}
      <!-- MEMORIES BROWSER -->
      <div class="mem-section">
        <div class="mem-search">
          <input class="search-input" type="text" placeholder="Search memories..." bind:value={searchQuery} onkeydown={(e) => { if (e.key === "Enter") searchMemories(); }} />
          <button class="search-btn" onclick={searchMemories}>🔍</button>
        </div>
        <div class="filter-row">
          <button class="filter-chip" class:active={filterCat === "all"} onclick={() => filterCat = "all"}>All</button>
          {#each Object.keys(knowledge.categories) as cat}
            <button class="filter-chip" class:active={filterCat === cat} onclick={() => filterCat = cat}>
              {CAT_ICONS[cat] || "📁"} {cat.replace("_", " ")}
            </button>
          {/each}
        </div>
        <div class="mem-list">
          {#each filtered as mem (mem.id)}
            <button class="mem-card" onclick={() => readMemory(mem.id)}>
              <div class="mem-top">
                <span class="mem-cat-icon">{CAT_ICONS[mem.category] || "📁"}</span>
                <span class="mem-slug">{mem.slug}</span>
                <span class="mem-tokens">{mem.tokenCount} tok</span>
              </div>
              <div class="mem-abstract">{mem.abstract}</div>
            </button>
          {:else}
            <div class="empty-state">
              <span class="empty-emoji">📚</span>
              <span class="empty-title">{knowledge.totalMemories === 0 ? "No memories yet" : "No matches"}</span>
              <span class="empty-hint">{knowledge.totalMemories === 0 ? "Memories are extracted from completed tasks" : "Try a different search or filter"}</span>
            </div>
          {/each}
        </div>
      </div>

    {:else}
      <!-- SESSION MONITOR -->
      <div class="session-section">
        <div class="stats-row">
          <div class="stat-card"><span class="stat-val">{summary.totalTokensUsed || 0}</span><span class="stat-lbl">Sent</span></div>
          <div class="stat-card saved"><span class="stat-val">+{summary.totalTokensSaved || 0}</span><span class="stat-lbl">Saved</span></div>
          <div class="stat-card"><span class="stat-val">{entries.length}</span><span class="stat-lbl">Files</span></div>
        </div>
        <div class="tier-row">
          {#each [["L0","Abstract"],["L1","Summary"],["L2","Full"]] as [t,l]}
            <span class="tier-dot" style:background={TIER_COLORS[t]}></span><span class="tier-lbl">{t} {l}</span>
          {/each}
          <span style="flex:1"></span>
          <button class="clear-btn" onclick={clearSession}>Clear</button>
        </div>
        {#if entries.length === 0}
          <div class="empty-state"><span class="empty-emoji">📊</span><span class="empty-title">No session data</span><span class="empty-hint">Memories load as agents access them</span></div>
        {:else}
          {#each entries as entry, i}
            <div class="entry-row" style="animation: var(--animate-fade-in); animation-delay: {i * 30}ms; animation-fill-mode: both">
              <div class="entry-tier" style:background={TIER_COLORS[entry.tierLoaded] || "gray"}>{entry.tierLoaded}</div>
              <div class="entry-body">
                <span class="entry-name" title={entry.filePath}>{entry.filePath.split(/[\\/]/).pop()}</span>
                <span class="entry-stats">{entry.tokensUsed} tok <span style="color:var(--color-status-done)">+{entry.fullTokenCount - entry.tokensUsed}</span></span>
              </div>
              <div class="entry-bar-track"><div class="entry-bar-fill" style:width="{Math.round((entry.tokensUsed / Math.max(entry.fullTokenCount, 1)) * 100)}%" style:background={TIER_COLORS[entry.tierLoaded]}></div></div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .k-root { display: flex; flex-direction: column; height: 100%; }
  .sub-tabs { display: flex; border-bottom: 1px solid var(--color-border); background: color-mix(in srgb, var(--color-muted) 30%, transparent); }
  .sub-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px 4px; border: none; border-bottom: 2px solid transparent; background: none; color: var(--color-muted-foreground); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.12s; font-family: inherit; }
  .sub-tab:hover { color: var(--color-foreground); background: var(--color-accent); }
  .sub-tab.active { color: var(--color-foreground); border-bottom-color: var(--color-primary); }
  .sub-count { min-width: 16px; height: 16px; padding: 0 4px; border-radius: 99px; background: var(--color-muted); font-size: 9px; font-weight: 700; line-height: 16px; text-align: center; }
  .k-content { flex: 1; overflow-y: auto; padding: 8px; }

  /* Brain */
  .brain-section { display: flex; flex-direction: column; gap: 8px; }
  .brain-actions { display: flex; gap: 4px; }
  .k-btn { flex: 1; padding: 7px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-card); color: inherit; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.12s; font-family: inherit; }
  .k-btn:hover { border-color: var(--color-ring); }
  .k-btn.primary { background: var(--color-primary); color: var(--color-primary-foreground); border-color: var(--color-primary); }
  .k-btn.primary:hover { opacity: 0.9; }
  .brain-preview { border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; background: var(--color-card); max-height: 300px; overflow-y: auto; }
  .bp-h1 { font-size: 14px; font-weight: 700; margin: 0 0 6px; }
  .bp-h2 { font-size: 12px; font-weight: 700; margin: 8px 0 4px; color: var(--color-primary); }
  .bp-quote { font-size: 10px; color: var(--color-muted-foreground); margin: 0 0 4px; padding-left: 8px; border-left: 2px solid var(--color-border); font-style: italic; }
  .bp-item { font-size: 11px; margin: 2px 0; padding-left: 12px; position: relative; }
  .bp-item::before { content: "•"; position: absolute; left: 2px; color: var(--color-primary); }
  .bp-text { font-size: 11px; margin: 2px 0; }
  .cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-top: 4px; }
  .cat-chip { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); cursor: pointer; transition: all 0.12s; font-family: inherit; color: inherit; font-size: 11px; }
  .cat-chip:hover { border-color: var(--color-ring); background: var(--color-accent); }
  .cat-icon { font-size: 14px; }
  .cat-name { flex: 1; font-weight: 500; text-transform: capitalize; }
  .cat-count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px; background: var(--color-primary); color: var(--color-primary-foreground); font-size: 9px; font-weight: 700; line-height: 18px; text-align: center; }

  /* Memories */
  .mem-section { display: flex; flex-direction: column; gap: 6px; }
  .mem-search { display: flex; gap: 4px; }
  .search-input { flex: 1; padding: 6px 10px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-input); color: var(--color-foreground); font-size: 11px; font-family: inherit; outline: none; }
  .search-input:focus { border-color: var(--color-ring); }
  .search-btn { width: 32px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-card); cursor: pointer; font-size: 12px; transition: all 0.12s; }
  .search-btn:hover { border-color: var(--color-ring); }
  .filter-row { display: flex; gap: 3px; flex-wrap: wrap; }
  .filter-chip { padding: 3px 8px; border: 1px solid var(--color-border); border-radius: 99px; background: none; color: var(--color-muted-foreground); font-size: 9px; font-weight: 600; cursor: pointer; transition: all 0.12s; font-family: inherit; text-transform: capitalize; }
  .filter-chip:hover { border-color: var(--color-ring); color: var(--color-foreground); }
  .filter-chip.active { background: var(--color-primary); color: var(--color-primary-foreground); border-color: var(--color-primary); }
  .mem-list { display: flex; flex-direction: column; gap: 4px; }
  .mem-card { text-align: left; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); cursor: pointer; transition: all 0.12s; font-family: inherit; color: inherit; }
  .mem-card:hover { border-color: var(--color-ring); box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ring) 12%, transparent); }
  .mem-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .mem-cat-icon { font-size: 12px; }
  .mem-slug { flex: 1; font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mem-tokens { font-size: 9px; color: var(--color-muted-foreground); font-variant-numeric: tabular-nums; }
  .mem-abstract { font-size: 10px; color: var(--color-muted-foreground); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  /* Session */
  .session-section { display: flex; flex-direction: column; gap: 6px; }
  .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
  .stat-card { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); }
  .stat-card.saved { background: color-mix(in srgb, var(--color-status-done) 8%, var(--color-card)); border-color: color-mix(in srgb, var(--color-status-done) 25%, transparent); }
  .stat-card.saved .stat-val { color: var(--color-status-done); }
  .stat-val { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .stat-lbl { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted-foreground); }
  .tier-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
  .tier-dot { width: 6px; height: 6px; border-radius: 50%; }
  .tier-lbl { font-size: 9px; font-weight: 600; }
  .clear-btn { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: 4px; background: none; color: var(--color-muted-foreground); font-size: 9px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .clear-btn:hover { border-color: var(--color-ring); color: var(--color-foreground); }
  .entry-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); position: relative; overflow: hidden; }
  .entry-tier { min-width: 22px; height: 18px; padding: 0 4px; border-radius: 4px; font-size: 9px; font-weight: 800; line-height: 18px; text-align: center; color: var(--color-background); }
  .entry-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .entry-name { font-size: 11px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .entry-stats { font-size: 9px; font-variant-numeric: tabular-nums; color: var(--color-muted-foreground); }
  .entry-bar-track { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: color-mix(in srgb, var(--color-border) 30%, transparent); }
  .entry-bar-fill { height: 100%; opacity: 0.6; transition: width 0.3s; }

  /* Empty */
  .empty-state { display: flex; flex-direction: column; align-items: center; padding: 28px 16px; gap: 6px; color: var(--color-muted-foreground); text-align: center; }
  .empty-emoji { font-size: 28px; opacity: 0.3; }
  .empty-title { font-size: 12px; font-weight: 600; }
  .empty-hint { font-size: 10px; opacity: 0.6; }
</style>
