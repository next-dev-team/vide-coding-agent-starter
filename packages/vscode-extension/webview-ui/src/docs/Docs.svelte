<script lang="ts">
  import { onMount } from "svelte";
  import type { DocEntry, DocsData, InboundMessage } from "$lib/types";
  import { getVsCode, onMessage } from "$lib/vscode";
  import Button from "$lib/components/ui/button.svelte";
  import Card from "$lib/components/ui/card.svelte";
  import Badge from "$lib/components/ui/badge.svelte";

  type Tab = "prds" | "adrs" | "tasks" | "testCases";

  const vscode = getVsCode<{ tab: Tab; query: string }>();
  const persisted = vscode.getState();

  let docs = $state<DocsData>({ prds: [], adrs: [], tasks: [], testCases: [] });
  let activeTab = $state<Tab>(persisted?.tab ?? "prds");
  let query = $state(persisted?.query ?? "");

  const tabConfig: Array<{ id: Tab; label: string }> = [
    { id: "prds", label: "PRDs" },
    { id: "adrs", label: "ADRs" },
    { id: "tasks", label: "Tasks" },
    { id: "testCases", label: "Test Cases" },
  ];

  const entries = $derived<DocEntry[]>(docs[activeTab] ?? []);
  const filtered = $derived(
    query
      ? entries.filter((e) => {
          const q = query.toLowerCase();
          return (
            e.title.toLowerCase().includes(q) ||
            e.filename.toLowerCase().includes(q) ||
            (e.summary?.toLowerCase().includes(q) ?? false)
          );
        })
      : entries,
  );

  function setTab(tab: Tab) {
    activeTab = tab;
    vscode.setState({ tab, query });
  }

  function setQuery(q: string) {
    query = q;
    vscode.setState({ tab: activeTab, query: q });
  }

  function open(entry: DocEntry) {
    if (activeTab === "prds") vscode.postMessage({ type: "openPrd", filename: entry.filename });
    else if (activeTab === "adrs")
      vscode.postMessage({ type: "openAdr", filename: entry.filename });
    else if (activeTab === "testCases")
      vscode.postMessage({ type: "openTestCase", filename: entry.filename });
    else vscode.postMessage({ type: "openFile", filename: entry.filename });
  }

  onMount(() => {
    vscode.postMessage({ type: "refresh" });
    return onMessage<InboundMessage>((msg) => {
      if (msg.type === "docsUpdated") docs = msg.docs;
    });
  });
</script>

<div class="flex h-screen flex-col">
  <header class="flex items-center justify-between border-b border-border px-4 py-3">
    <h1 class="text-sm font-bold uppercase tracking-wider">Documents</h1>
    <input
      type="search"
      placeholder="Search…"
      value={query}
      oninput={(e) => setQuery(e.currentTarget.value)}
      class="h-7 w-64 rounded border border-border bg-input px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
    />
  </header>

  <nav class="flex gap-1 border-b border-border px-3">
    {#each tabConfig as tab (tab.id)}
      {@const count = (docs[tab.id] ?? []).length}
      <button
        class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
        class:opacity-50={activeTab !== tab.id}
        class:border-b-2={activeTab === tab.id}
        class:border-ring={activeTab === tab.id}
        onclick={() => setTab(tab.id)}
      >
        {tab.label}
        {#if count > 0}
          <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{count}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="flex-1 overflow-auto p-3">
    {#if filtered.length === 0}
      <div class="flex h-32 items-center justify-center text-xs text-muted-foreground italic">
        {query ? `No matches for "${query}"` : "No documents"}
      </div>
    {:else}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2">
        {#each filtered as entry (entry.filename)}
          <Card>
            <button class="flex w-full flex-col gap-1.5 p-3 text-left" onclick={() => open(entry)}>
              <div class="flex items-center justify-between gap-2">
                <span class="line-clamp-1 text-xs font-semibold">{entry.title}</span>
                {#if entry.status}
                  <Badge>{entry.status}</Badge>
                {/if}
              </div>
              <span class="line-clamp-1 text-[10px] font-mono text-muted-foreground">
                {entry.filename}
              </span>
              {#if entry.summary}
                <span class="line-clamp-2 text-[11px] text-muted-foreground">{entry.summary}</span>
              {/if}
            </button>
          </Card>
        {/each}
      </div>
    {/if}
  </div>
</div>
