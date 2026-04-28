<script lang="ts">
  import { onMount } from "svelte";
  import type { Board, DocsData, SkillInfo } from "$lib/types";
  import { getVsCode, onMessage } from "$lib/vscode";
  import { demoBoard } from "$lib/demo-board";

  import KanbanTab from "./tabs/KanbanTab.svelte";
  import DocsTab from "./tabs/DocsTab.svelte";
  import SkillsTab from "./tabs/SkillsTab.svelte";
  import WorkflowTab from "./tabs/WorkflowTab.svelte";
  import McpTab from "./tabs/McpTab.svelte";
  import KnowledgeTab from "./tabs/KnowledgeTab.svelte";

  const vscode = getVsCode<{ activeTab: string }>();

  let board = $state<Board>(demoBoard);
  let docs = $state<DocsData>({ prds: [], adrs: [], tasks: [] });
  let skills = $state<SkillInfo[]>([]);
  let knowledge = $state<any>({ brainContent: "", brainExists: false, memories: [], categories: {}, totalMemories: 0 });

  let activeTab = $state<string>(vscode.getState()?.activeTab || "kanban");

  const TABS = [
    { id: "kanban", icon: "📋", label: "Board" },
    { id: "docs",   icon: "📄", label: "Docs" },
    { id: "skills", icon: "⚙️", label: "Skills" },
    { id: "workflow", icon: "🚀", label: "Agent" },
    { id: "mcp",    icon: "🔌", label: "MCP" },
    { id: "knowledge", icon: "🧠", label: "Know" },
  ] as const;

  function switchTab(tab: string) {
    activeTab = tab;
    vscode.setState({ ...vscode.getState(), activeTab: tab });
  }

  function refresh() {
    vscode.postMessage({ type: "refresh" });
  }

  function tabBadge(id: string): number | null {
    if (id === "kanban") return board.totalTasks || null;
    if (id === "docs") {
      const n = docs.prds.length + docs.adrs.length + docs.tasks.length;
      return n || null;
    }
    if (id === "skills") return skills.length || null;
    if (id === "knowledge") return knowledge.totalMemories || null;
    return null;
  }

  onMount(() => {
    vscode.postMessage({ type: "refresh" });
    return onMessage<any>((msg) => {
      if (msg.type === "boardUpdated") {
        if (msg.board) board = msg.board;
        if (msg.docs) docs = msg.docs;
        if (msg.skills) skills = msg.skills;
        if (msg.knowledge) knowledge = msg.knowledge;
      }
    });
  });
</script>

<div class="flex h-screen flex-col">
  <!-- ── Icon Tab Bar ────────────────────────────────────────── -->
  <nav class="tab-bar shrink-0">
    {#each TABS as tab (tab.id)}
      {@const active = activeTab === tab.id}
      {@const badge = tabBadge(tab.id)}
      <button
        class="tab-item"
        class:active
        onclick={() => switchTab(tab.id)}
        title={tab.label}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
        {#if badge}
          <span class="tab-badge">{badge}</span>
        {/if}
        {#if active}
          <span class="tab-indicator"></span>
        {/if}
      </button>
    {/each}

    <!-- Spacer pushes refresh to the right -->
    <div class="flex-1"></div>
    <button class="tab-refresh" onclick={refresh} title="Refresh">↻</button>
  </nav>

  <!-- ── Tab Content ─────────────────────────────────────────── -->
  <div class="flex-1 overflow-auto" style="animation: var(--animate-fade-in)">
    {#if activeTab === "kanban"}
      <KanbanTab {board} />
    {:else if activeTab === "docs"}
      <DocsTab {docs} />
    {:else if activeTab === "skills"}
      <SkillsTab {skills} />
    {:else if activeTab === "workflow"}
      <WorkflowTab />
    {:else if activeTab === "mcp"}
      <McpTab />
    {:else if activeTab === "knowledge"}
      <KnowledgeTab {knowledge} />
    {/if}
  </div>
</div>

<style>
  .tab-bar {
    display: flex;
    align-items: stretch;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 40%, transparent);
    overflow-x: auto;
  }
  .tab-bar::-webkit-scrollbar { display: none; }

  .tab-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 6px 8px 4px;
    min-width: 42px;
    border: none;
    background: none;
    color: var(--color-muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .tab-item:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
  }
  .tab-item.active {
    color: var(--color-foreground);
  }

  .tab-icon {
    font-size: 14px;
    line-height: 1;
  }
  .tab-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1;
  }

  .tab-badge {
    position: absolute;
    top: 3px;
    right: 3px;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    border-radius: 99px;
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    font-size: 8px;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
  }

  .tab-indicator {
    position: absolute;
    bottom: 0;
    left: 25%;
    right: 25%;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--color-primary);
  }

  .tab-refresh {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    margin: 4px 4px 4px 0;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .tab-refresh:hover {
    background: var(--color-accent);
    color: var(--color-foreground);
  }
</style>
