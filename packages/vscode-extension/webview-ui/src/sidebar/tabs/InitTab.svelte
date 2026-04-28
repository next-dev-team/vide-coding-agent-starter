<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import Button from "$lib/components/ui/button.svelte";

  const vscode = getVsCode<{}>();

  type Framework = {
    id: string;
    name: string;
    icon: string;
    desc: string;
    color: string;
    command: string;
    features: string[];
    docs: string;
  };

  const FRAMEWORKS: Framework[] = [
    {
      id: "vite-react",
      name: "Vite + React",
      icon: "⚡",
      desc: "Lightning-fast React app with TypeScript",
      color: "var(--color-status-wip)",
      command: "npx -y create-vite@latest . -- --template react-ts",
      features: ["React 19", "TypeScript", "HMR", "ESBuild"],
      docs: "https://vite.dev/guide/",
    },
    {
      id: "vite-vue",
      name: "Vite + Vue",
      icon: "💚",
      desc: "Progressive Vue 3 app with Vite",
      color: "#42b883",
      command: "npx -y create-vite@latest . -- --template vue-ts",
      features: ["Vue 3", "TypeScript", "Composition API", "Vite"],
      docs: "https://vuejs.org/guide/quick-start",
    },
    {
      id: "vite-svelte",
      name: "Vite + Svelte",
      icon: "🔥",
      desc: "Cybernetically enhanced Svelte app",
      color: "#ff3e00",
      command: "npx -y create-vite@latest . -- --template svelte-ts",
      features: ["Svelte 5", "TypeScript", "Runes", "Vite"],
      docs: "https://svelte.dev/docs/introduction",
    },
    {
      id: "nextjs",
      name: "Next.js",
      icon: "▲",
      desc: "Full-stack React framework by Vercel",
      color: "var(--color-foreground)",
      command: "npx -y create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias @/* --use-npm",
      features: ["App Router", "TypeScript", "Server Components", "Tailwind"],
      docs: "https://nextjs.org/docs",
    },
    {
      id: "tanstack-start",
      name: "TanStack Start",
      icon: "🚀",
      desc: "Full-stack React framework with TanStack Router",
      color: "#ef4444",
      command: "npx -y @tanstack/create-start@latest . --template basic --package-manager npm",
      features: ["TanStack Router", "TypeScript", "Full-Stack", "Vinxi"],
      docs: "https://tanstack.com/start/latest",
    },
    {
      id: "tanstack-router",
      name: "TanStack Router",
      icon: "🧭",
      desc: "Type-safe client-side routing for React",
      color: "#f59e0b",
      command: "npx -y @tanstack/create-router@latest . --template vite --package-manager npm",
      features: ["Type-safe Routes", "TypeScript", "Vite", "Search Params"],
      docs: "https://tanstack.com/router/latest",
    },
  ];

  const KANBAN_TEMPLATES = [
    {
      id: "blank",
      name: "Kanban Only",
      icon: "📋",
      desc: "Minimal docs/ and .agents/ workflow scaffold",
      color: "var(--color-status-todo)",
    },
    {
      id: "todo-vite-react",
      name: "Todo (Vite + React)",
      icon: "✅",
      desc: "Working React todo with AI-ready tasks",
      color: "var(--color-status-done)",
    },
    {
      id: "todo-flutter",
      name: "Todo (Flutter)",
      icon: "🐦",
      desc: "Flutter todo app with agent workflow",
      color: "var(--color-status-verified)",
    },
  ];

  let selectedFramework = $state<Framework | null>(null);
  let projectName = $state("my-app");
  let initKanban = $state(true);
  let isRunning = $state(false);
  let runResult = $state<{ success: boolean; message: string } | null>(null);

  function selectFramework(fw: Framework) {
    selectedFramework = fw;
    runResult = null;
  }

  function clearSelection() {
    selectedFramework = null;
    runResult = null;
  }

  function initProject() {
    if (!selectedFramework) return;
    isRunning = true;
    runResult = null;
    vscode.postMessage({
      type: "initProject",
      framework: selectedFramework.id,
      command: selectedFramework.command,
      projectName,
      initKanban,
    });
  }

  function initFromTemplate(templateId: string) {
    vscode.postMessage({
      type: "initFromTemplate",
      templateId,
    });
  }

  function openDocs(url: string) {
    vscode.postMessage({ type: "openUrl", url });
  }

  // Listen for init result
  import { onMount } from "svelte";
  import { onMessage } from "$lib/vscode";

  onMount(() => {
    return onMessage<any>((msg) => {
      if (msg.type === "initResult") {
        isRunning = false;
        runResult = { success: msg.success, message: msg.message };
      }
    });
  });
</script>

<div class="init-root">
  {#if !selectedFramework}
    <!-- ── Framework Selection ────────────────────────────── -->
    <div class="init-section">
      <div class="init-section-title">
        <span>⚡ Create New Project</span>
      </div>
      <p class="init-hint">Choose a framework to scaffold a new project in the current workspace</p>
      <div class="fw-grid">
        {#each FRAMEWORKS as fw}
          <button class="fw-card" onclick={() => selectFramework(fw)}>
            <div class="fw-icon-ring" style:border-color={fw.color}>
              <span class="fw-icon">{fw.icon}</span>
            </div>
            <span class="fw-name">{fw.name}</span>
            <span class="fw-desc">{fw.desc}</span>
            <div class="fw-tags">
              {#each fw.features.slice(0, 2) as feat}
                <span class="fw-tag">{feat}</span>
              {/each}
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- ── Kanban Templates ───────────────────────────────── -->
    <div class="init-section">
      <div class="init-section-title">
        <span>📋 Kanban Templates</span>
      </div>
      <p class="init-hint">Pre-built templates with agent workflow structure</p>
      {#each KANBAN_TEMPLATES as tpl}
        <button class="tpl-row" onclick={() => initFromTemplate(tpl.id)}>
          <div class="tpl-icon" style:color={tpl.color}>{tpl.icon}</div>
          <div class="tpl-body">
            <span class="tpl-name">{tpl.name}</span>
            <span class="tpl-desc">{tpl.desc}</span>
          </div>
          <span class="tpl-arrow">→</span>
        </button>
      {/each}
    </div>

  {:else}
    <!-- ── Project Configuration ──────────────────────────── -->
    <div class="config-root">
      <button class="back-btn" onclick={clearSelection}>
        ← Back to frameworks
      </button>

      <div class="config-header">
        <div class="config-icon-ring" style:border-color={selectedFramework.color}>
          <span class="config-icon">{selectedFramework.icon}</span>
        </div>
        <div class="config-title-area">
          <h3 class="config-name">{selectedFramework.name}</h3>
          <p class="config-desc">{selectedFramework.desc}</p>
        </div>
      </div>

      <!-- Features -->
      <div class="config-features">
        {#each selectedFramework.features as feat}
          <span class="config-tag">{feat}</span>
        {/each}
      </div>

      <!-- Project name input -->
      <div class="config-field">
        <label class="config-label" for="project-name">Project Directory</label>
        <input
          id="project-name"
          class="config-input"
          type="text"
          bind:value={projectName}
          placeholder="my-app"
        />
        <span class="config-help">Relative to current workspace</span>
      </div>

      <!-- Kanban toggle -->
      <label class="toggle-row">
        <div class="toggle-track" class:on={initKanban}>
          <div class="toggle-thumb"></div>
        </div>
        <input type="checkbox" bind:checked={initKanban} class="sr-only" />
        <div class="toggle-label">
          <span>📋 Init Kanban Workflow</span>
          <span class="toggle-desc">Add docs/, .agents/, and AGENTS.md</span>
        </div>
      </label>

      <!-- Command preview -->
      <div class="cmd-preview">
        <div class="cmd-header">
          <span class="cmd-label">Command</span>
        </div>
        <code class="cmd-code">{selectedFramework.command.replace('. ', `${projectName} `)}</code>
      </div>

      <!-- Actions -->
      <div class="config-actions">
        <Button
          variant="default"
          size="md"
          class="w-full"
          onclick={initProject}
          disabled={isRunning || !projectName.trim()}
        >
          {#if isRunning}
            ⏳ Scaffolding...
          {:else}
            🚀 Create Project
          {/if}
        </Button>

        <!-- svelte-ignore a11y_invalid_attribute -->
        <a href="#" class="docs-link" onclick={(e) => { e.preventDefault(); openDocs(selectedFramework!.docs); }}>
          📖 View {selectedFramework.name} Docs
        </a>
      </div>

      <!-- Result -->
      {#if runResult}
        <div class="result-box" class:success={runResult.success} class:error={!runResult.success}>
          <span class="result-icon">{runResult.success ? '✅' : '❌'}</span>
          <span class="result-text">{runResult.message}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .init-root {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .init-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .init-section-title {
    padding: 8px 4px 2px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted-foreground);
  }

  .init-hint {
    margin: 0;
    padding: 0 4px 4px;
    font-size: 10px;
    color: var(--color-muted-foreground);
  }

  /* ── Framework Grid ──────────────────────────────────────── */
  .fw-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .fw-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    color: inherit;
  }
  .fw-card:hover {
    border-color: var(--color-ring);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-ring) 15%, transparent);
  }

  .fw-icon-ring {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid;
    border-radius: 50%;
    font-size: 16px;
    transition: transform 0.2s ease;
  }
  .fw-card:hover .fw-icon-ring {
    transform: scale(1.1);
  }

  .fw-icon { font-size: 16px; }
  .fw-name { font-size: 11px; font-weight: 700; }
  .fw-desc {
    font-size: 9px;
    color: var(--color-muted-foreground);
    text-align: center;
    line-height: 1.3;
  }

  .fw-tags {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .fw-tag {
    font-size: 8px;
    padding: 1px 5px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  /* ── Kanban Templates ────────────────────────────────────── */
  .tpl-row {
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
  .tpl-row:hover {
    border-color: var(--color-ring);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ring) 12%, transparent);
  }

  .tpl-icon { font-size: 18px; }
  .tpl-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .tpl-name { font-size: 12px; font-weight: 600; }
  .tpl-desc { font-size: 10px; color: var(--color-muted-foreground); }
  .tpl-arrow { color: var(--color-muted-foreground); font-size: 12px; }

  /* ── Config Panel ────────────────────────────────────────── */
  .config-root {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--color-primary);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    align-self: flex-start;
    transition: background 0.12s ease;
  }
  .back-btn:hover {
    background: var(--color-accent);
  }

  .config-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-muted) 30%, transparent);
  }

  .config-icon-ring {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2.5px solid;
    border-radius: 50%;
    font-size: 20px;
    flex-shrink: 0;
  }

  .config-icon { font-size: 20px; }
  .config-title-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .config-name {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
    color: var(--color-foreground);
  }
  .config-desc {
    font-size: 11px;
    color: var(--color-muted-foreground);
    margin: 0;
  }

  .config-features {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .config-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    font-weight: 600;
  }

  /* ── Input field ─────────────────────────────────────────── */
  .config-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .config-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted-foreground);
  }

  .config-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-input);
    color: var(--color-foreground);
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    outline: none;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }
  .config-input:focus {
    border-color: var(--color-ring);
  }

  .config-help {
    font-size: 9px;
    color: var(--color-muted-foreground);
  }

  /* ── Toggle ──────────────────────────────────────────────── */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  .toggle-track {
    width: 28px;
    height: 16px;
    border-radius: 99px;
    background: var(--color-muted);
    position: relative;
    transition: background 0.15s ease;
    flex-shrink: 0;
  }
  .toggle-track.on {
    background: var(--color-primary);
  }
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 99px;
    background: var(--color-foreground);
    transition: transform 0.15s ease;
  }
  .toggle-track.on .toggle-thumb {
    transform: translateX(12px);
  }
  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 11px;
    font-weight: 500;
  }
  .toggle-desc {
    font-size: 9px;
    color: var(--color-muted-foreground);
  }

  /* ── Command preview ─────────────────────────────────────── */
  .cmd-preview {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-card);
  }

  .cmd-header {
    padding: 6px 10px;
    background: color-mix(in srgb, var(--color-muted) 50%, transparent);
    border-bottom: 1px solid var(--color-border);
  }

  .cmd-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted-foreground);
  }

  .cmd-code {
    display: block;
    padding: 8px 10px;
    font-size: 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--color-foreground);
    word-break: break-all;
    line-height: 1.5;
  }

  /* ── Actions ─────────────────────────────────────────────── */
  .config-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .docs-link {
    font-size: 10px;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
  }
  .docs-link:hover {
    text-decoration: underline;
  }

  /* ── Result box ──────────────────────────────────────────── */
  .result-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 11px;
    line-height: 1.4;
    animation: var(--animate-fade-in);
  }
  .result-box.success {
    background: color-mix(in srgb, var(--color-status-done) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-status-done) 30%, transparent);
    color: var(--color-status-done);
  }
  .result-box.error {
    background: color-mix(in srgb, var(--color-status-blocked) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-status-blocked) 30%, transparent);
    color: var(--color-status-blocked);
  }
  .result-icon { font-size: 14px; flex-shrink: 0; }
  .result-text { flex: 1; }
</style>
