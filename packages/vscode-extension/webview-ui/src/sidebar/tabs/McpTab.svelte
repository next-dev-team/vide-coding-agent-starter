<script lang="ts">
  import { getVsCode } from "$lib/vscode";

  const vscode = getVsCode<{}>();

  function setupMcp(target: string) { vscode.postMessage({ type: "setupMcpServer", target }); }
  function setupCompanion(server: string) { vscode.postMessage({ type: "setupCompanion", server }); }
  function reloadWindow() { vscode.postMessage({ type: "reloadWindow" }); }

  const EDITORS = [
    { id: "vscode", icon: "🔧", name: "VS Code", desc: "settings.json", primary: true },
    { id: "claude", icon: "🤖", name: "Claude Desktop", desc: "claude_desktop_config.json", primary: false },
    { id: "cursor", icon: "⚡", name: "Cursor", desc: "cursor config", primary: false },
  ];

  const COMPANIONS = [
    { id: "context7", icon: "📚", name: "Context7", desc: "Library docs & context", color: "var(--color-status-todo)" },
    { id: "playwright", icon: "🎭", name: "Playwright", desc: "Browser automation", color: "var(--color-status-verified)" },
  ];
</script>

<div class="mcp-root">
  <!-- ── Editor Setup ───────────────────────────────────── -->
  <div class="mcp-section">
    <div class="mcp-section-title">
      <span>⚙️ Add to Editor</span>
    </div>
    {#each EDITORS as editor}
      <button
        class="mcp-row"
        class:primary={editor.primary}
        onclick={() => setupMcp(editor.id)}
      >
        <span class="mcp-row-icon">{editor.icon}</span>
        <div class="mcp-row-body">
          <span class="mcp-row-name">{editor.name}</span>
          <span class="mcp-row-desc">{editor.desc}</span>
        </div>
        <span class="mcp-row-arrow">→</span>
      </button>
    {/each}
  </div>

  <!-- ── Companion Servers ──────────────────────────────── -->
  <div class="mcp-section">
    <div class="mcp-section-title">
      <span>🔌 Companion Servers</span>
    </div>
    <p class="mcp-hint">Optional MCP servers that enhance agent workflows</p>
    <div class="companion-grid">
      {#each COMPANIONS as comp}
        <button class="companion-card" onclick={() => setupCompanion(comp.id)}>
          <div class="companion-icon-ring" style:border-color={comp.color}>
            <span>{comp.icon}</span>
          </div>
          <span class="companion-name">{comp.name}</span>
          <span class="companion-desc">{comp.desc}</span>
          <span class="companion-add">+ Add</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- ── Status ─────────────────────────────────────────── -->
  <div class="mcp-section">
    <div class="mcp-section-title">
      <span>🔄 Troubleshooting</span>
    </div>
    <button class="reload-btn" onclick={reloadWindow}>
      <span>↻</span>
      <span>Reload Window</span>
    </button>
  </div>
</div>

<style>
  .mcp-root {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mcp-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mcp-section-title {
    padding: 8px 4px 2px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted-foreground);
  }

  .mcp-hint {
    margin: 0;
    padding: 0 4px;
    font-size: 10px;
    color: var(--color-muted-foreground);
  }

  /* ── Editor rows ──────────────────────────────────────── */
  .mcp-row {
    display: flex;
    align-items: center;
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
  .mcp-row:hover {
    border-color: var(--color-ring);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ring) 12%, transparent);
  }
  .mcp-row.primary {
    background: color-mix(in srgb, var(--color-primary) 10%, var(--color-card));
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  .mcp-row-icon { font-size: 18px; }
  .mcp-row-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .mcp-row-name { font-size: 12px; font-weight: 600; }
  .mcp-row-desc { font-size: 10px; color: var(--color-muted-foreground); }
  .mcp-row-arrow { color: var(--color-muted-foreground); font-size: 12px; }

  /* ── Companion grid ───────────────────────────────────── */
  .companion-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-top: 4px;
  }

  .companion-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    color: inherit;
  }
  .companion-card:hover {
    border-color: var(--color-ring);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-ring) 15%, transparent);
  }

  .companion-icon-ring {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid;
    border-radius: 50%;
    font-size: 16px;
  }

  .companion-name {
    font-size: 12px;
    font-weight: 600;
  }
  .companion-desc {
    font-size: 9px;
    color: var(--color-muted-foreground);
    text-align: center;
  }
  .companion-add {
    font-size: 9px;
    font-weight: 700;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ── Reload ───────────────────────────────────────────── */
  .reload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    border: 1px dashed var(--color-border);
    border-radius: 6px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
  }
  .reload-btn:hover {
    border-color: var(--color-ring);
    color: var(--color-foreground);
  }
</style>
