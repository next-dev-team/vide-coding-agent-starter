<script lang="ts">
  import { getVsCode } from "$lib/vscode";

  const vscode = getVsCode<{ browserHistory?: string[]; browserBookmarks?: string[] }>();
  const persisted = vscode.getState();

  let url = $state("");
  let history = $state<string[]>(persisted?.browserHistory || []);

  function go() {
    const trimmed = url.trim();
    if (!trimmed) return;
    const full = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    vscode.postMessage({ type: "openUrl", url: full });
    if (!history.includes(full)) {
      history = [full, ...history].slice(0, 20);
      vscode.setState({ ...vscode.getState(), browserHistory: history });
    }
    url = "";
  }

  function openUrl(u: string) {
    vscode.postMessage({ type: "openUrl", url: u });
  }

  function clearHistory() {
    history = [];
    vscode.setState({ ...vscode.getState(), browserHistory: [] });
  }

  const BOOKMARKS = [
    { icon: "📦", name: "npm", url: "https://www.npmjs.com", desc: "Package registry" },
    { icon: "🐙", name: "GitHub", url: "https://github.com", desc: "Code hosting" },
    { icon: "📖", name: "MDN", url: "https://developer.mozilla.org", desc: "Web docs" },
    { icon: "⚡", name: "Vite", url: "https://vite.dev", desc: "Build tool" },
    { icon: "🟧", name: "Svelte", url: "https://svelte.dev/docs", desc: "UI framework" },
    { icon: "🔷", name: "TypeScript", url: "https://www.typescriptlang.org/docs", desc: "TS docs" },
    { icon: "📋", name: "VS Code API", url: "https://code.visualstudio.com/api", desc: "Extension API" },
    { icon: "🤖", name: "MCP Spec", url: "https://modelcontextprotocol.io", desc: "Protocol docs" },
    { icon: "🎨", name: "Tailwind", url: "https://tailwindcss.com/docs", desc: "CSS framework" },
    { icon: "🐦", name: "Flutter", url: "https://docs.flutter.dev", desc: "Mobile SDK" },
    { icon: "📊", name: "Can I Use", url: "https://caniuse.com", desc: "Browser support" },
    { icon: "🔍", name: "DevDocs", url: "https://devdocs.io", desc: "Unified docs" },
  ];
</script>

<div class="br-root">
  <!-- URL Bar -->
  <div class="url-bar">
    <input
      class="url-input"
      type="text"
      placeholder="Enter URL or search..."
      bind:value={url}
      onkeydown={(e) => { if (e.key === "Enter") go(); }}
    />
    <button class="url-go" onclick={go}>→</button>
  </div>

  <!-- Quick Links -->
  <div class="section-title">
    <span>⭐ Quick Links</span>
  </div>
  <div class="bookmark-grid">
    {#each BOOKMARKS as bm}
      <button class="bookmark-card" onclick={() => openUrl(bm.url)} title={bm.url}>
        <span class="bm-icon">{bm.icon}</span>
        <span class="bm-name">{bm.name}</span>
        <span class="bm-desc">{bm.desc}</span>
      </button>
    {/each}
  </div>

  <!-- History -->
  {#if history.length > 0}
    <div class="section-title" style="margin-top: 4px">
      <span>🕐 Recent</span>
      <button class="clear-btn" onclick={clearHistory}>Clear</button>
    </div>
    <div class="history-list">
      {#each history as h}
        <button class="history-item" onclick={() => openUrl(h)}>
          <span class="hi-icon">🌐</span>
          <span class="hi-url">{h.replace(/^https?:\/\//, "")}</span>
          <span class="hi-arrow">→</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .br-root { padding: 8px; display: flex; flex-direction: column; gap: 6px; }

  .url-bar { display: flex; gap: 4px; }
  .url-input { flex: 1; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-input); color: var(--color-foreground); font-size: 11px; font-family: inherit; outline: none; }
  .url-input:focus { border-color: var(--color-ring); box-shadow: 0 0 0 1px var(--color-ring); }
  .url-go { width: 36px; border: none; border-radius: 8px; background: var(--color-primary); color: var(--color-primary-foreground); font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.12s; font-family: inherit; }
  .url-go:hover { opacity: 0.85; }

  .section-title { display: flex; align-items: center; justify-content: space-between; padding: 6px 4px 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted-foreground); }

  .bookmark-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .bookmark-card { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 4px 8px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); cursor: pointer; transition: all 0.12s; font-family: inherit; color: inherit; }
  .bookmark-card:hover { border-color: var(--color-ring); transform: translateY(-1px); box-shadow: 0 3px 10px color-mix(in srgb, var(--color-ring) 12%, transparent); }
  .bm-icon { font-size: 18px; }
  .bm-name { font-size: 10px; font-weight: 600; }
  .bm-desc { font-size: 8px; color: var(--color-muted-foreground); }

  .clear-btn { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: 4px; background: none; color: var(--color-muted-foreground); font-size: 9px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .clear-btn:hover { border-color: var(--color-ring); color: var(--color-foreground); }

  .history-list { display: flex; flex-direction: column; gap: 2px; }
  .history-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-card); cursor: pointer; transition: all 0.12s; font-family: inherit; color: inherit; text-align: left; }
  .history-item:hover { border-color: var(--color-ring); background: var(--color-accent); }
  .hi-icon { font-size: 12px; }
  .hi-url { flex: 1; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hi-arrow { color: var(--color-muted-foreground); font-size: 11px; }
</style>
