<script lang="ts">
  import { getVsCode } from "$lib/vscode";

  const vscode = getVsCode<{}>();

  let includeContext7 = $state(true);
  let includePlaywright = $state(true);

  function planFeature() { vscode.postMessage({ type: "planFeature" }); }
  function requestReview(type: string) { vscode.postMessage({ type: "requestReview", reviewType: type }); }
  function syncDocs() { vscode.postMessage({ type: "syncDocs" }); }
  function initAgentsMd() {
    vscode.postMessage({ type: "initAgentsMd", includeContext7, includePlaywright });
  }
  function setMemory(backend: string) {
    vscode.postMessage({ type: "setMemoryBackend", backend });
  }
  function openDocs() { vscode.postMessage({ type: "openDocs" }); }
</script>

<div class="wf-root">
  <!-- ── Quick Actions ──────────────────────────────────── -->
  <div class="wf-section">
    <div class="wf-section-title">
      <span>🚀 Quick Actions</span>
    </div>
    <button class="wf-action primary" onclick={planFeature}>
      <div class="wf-action-icon">📝</div>
      <div class="wf-action-body">
        <span class="wf-action-label">Plan Next Feature</span>
        <span class="wf-action-desc">Create a new PRD from template</span>
      </div>
      <span class="wf-action-arrow">→</span>
    </button>
    <button class="wf-action" onclick={syncDocs}>
      <div class="wf-action-icon">🔄</div>
      <div class="wf-action-body">
        <span class="wf-action-label">Sync Docs</span>
        <span class="wf-action-desc">Reconcile docs with codebase</span>
      </div>
      <span class="wf-action-arrow">→</span>
    </button>
  </div>

  <!-- ── Reviews ────────────────────────────────────────── -->
  <div class="wf-section">
    <div class="wf-section-title">
      <span>🔍 Code Reviews</span>
    </div>
    <div class="review-row">
      <button class="review-card" onclick={() => requestReview("security")}>
        <span class="review-icon">🔒</span>
        <span class="review-label">Security</span>
        <span class="review-hint">OWASP checklist</span>
      </button>
      <button class="review-card" onclick={() => requestReview("performance")}>
        <span class="review-icon">⚡</span>
        <span class="review-label">Performance</span>
        <span class="review-hint">N+1, memory, speed</span>
      </button>
    </div>
  </div>

  <!-- ── AGENTS.md ──────────────────────────────────────── -->
  <div class="wf-section">
    <div class="wf-section-title">
      <span>📄 AGENTS.md Generator</span>
    </div>
    <div class="agents-card">
      <span class="agents-hint">Include companion servers:</span>
      <label class="toggle-row">
        <div class="toggle-track" class:on={includeContext7}>
          <div class="toggle-thumb"></div>
        </div>
        <input type="checkbox" bind:checked={includeContext7} class="sr-only" />
        <div class="toggle-label">
          <span>📚 Context7</span>
          <span class="toggle-desc">Live docs lookup</span>
        </div>
      </label>
      <label class="toggle-row">
        <div class="toggle-track" class:on={includePlaywright}>
          <div class="toggle-thumb"></div>
        </div>
        <input type="checkbox" bind:checked={includePlaywright} class="sr-only" />
        <div class="toggle-label">
          <span>🎭 Playwright</span>
          <span class="toggle-desc">Browser automation</span>
        </div>
      </label>
      <button class="generate-btn" onclick={initAgentsMd}>
        Generate AGENTS.md
      </button>
    </div>
  </div>

  <!-- ── Memory Backend ─────────────────────────────────── -->
  <div class="wf-section">
    <div class="wf-section-title">
      <span>🗄️ Memory Backend</span>
    </div>
    <div class="memory-row">
      <button class="memory-chip" onclick={() => setMemory("sqlite")}>
        <span class="memory-icon">🗃</span>
        <span class="memory-label">SQLite</span>
        <span class="memory-desc">Fast FTS5</span>
      </button>
      <button class="memory-chip" onclick={() => setMemory("files")}>
        <span class="memory-icon">📄</span>
        <span class="memory-label">Files</span>
        <span class="memory-desc">Git-friendly</span>
      </button>
    </div>
  </div>

  <!-- ── Footer ─────────────────────────────────────────── -->
  <div class="wf-footer">
    <!-- svelte-ignore a11y_invalid_attribute -->
    <a href="#" onclick={(e) => { e.preventDefault(); openDocs(); }}>📖 Documentation</a>
  </div>
</div>

<style>
  .wf-root {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* ── Section ──────────────────────────────────────────── */
  .wf-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .wf-section-title {
    padding: 8px 4px 2px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted-foreground);
  }

  /* ── Action row ───────────────────────────────────────── */
  .wf-action {
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
  .wf-action:hover {
    border-color: var(--color-ring);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-ring) 12%, transparent);
  }
  .wf-action.primary {
    background: color-mix(in srgb, var(--color-primary) 10%, var(--color-card));
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  .wf-action-icon { font-size: 18px; }
  .wf-action-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .wf-action-label { font-size: 12px; font-weight: 600; }
  .wf-action-desc { font-size: 10px; color: var(--color-muted-foreground); }
  .wf-action-arrow { color: var(--color-muted-foreground); font-size: 12px; }

  /* ── Review cards ─────────────────────────────────────── */
  .review-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .review-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
    color: inherit;
  }
  .review-card:hover {
    border-color: var(--color-ring);
    background: var(--color-accent);
  }
  .review-icon { font-size: 20px; }
  .review-label { font-size: 11px; font-weight: 600; }
  .review-hint { font-size: 9px; color: var(--color-muted-foreground); }

  /* ── AGENTS.md card ───────────────────────────────────── */
  .agents-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
  }
  .agents-hint {
    font-size: 10px;
    color: var(--color-muted-foreground);
  }

  /* ── Toggle row ───────────────────────────────────────── */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
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

  .generate-btn {
    width: 100%;
    padding: 7px;
    border: none;
    border-radius: 6px;
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.12s ease;
    font-family: inherit;
  }
  .generate-btn:hover { opacity: 0.9; }

  /* ── Memory row ───────────────────────────────────────── */
  .memory-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .memory-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 8px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
    color: inherit;
  }
  .memory-chip:hover {
    border-color: var(--color-ring);
    background: var(--color-accent);
  }
  .memory-icon { font-size: 18px; }
  .memory-label { font-size: 11px; font-weight: 600; }
  .memory-desc { font-size: 9px; color: var(--color-muted-foreground); }

  /* ── Footer ───────────────────────────────────────────── */
  .wf-footer {
    padding: 12px 4px 4px;
    text-align: center;
    font-size: 10px;
  }
  .wf-footer a {
    color: var(--color-primary);
    text-decoration: none;
  }
  .wf-footer a:hover {
    text-decoration: underline;
  }
</style>
