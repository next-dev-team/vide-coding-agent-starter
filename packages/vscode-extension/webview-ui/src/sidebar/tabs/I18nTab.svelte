<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import { onMount, onDestroy } from "svelte";

  interface LocaleData {
    locale: string;
    filePath: string;
    keys: Record<string, string>;
  }
  interface CoverageEntry {
    locale: string;
    total: number;
    translated: number;
    percentage: number;
    missing: string[];
  }
  interface I18nData {
    detected: boolean;
    localeDir: string;
    defaultLocale: string;
    locales: LocaleData[];
    usedKeys: string[];
    coverage: CoverageEntry[];
  }

  const vscode = getVsCode<{ i18nSub?: string; i18nLocale?: string }>();

  let activeSub = $state<string>(vscode.getState()?.i18nSub || "locales");
  let activeLocale = $state<string>(vscode.getState()?.i18nLocale || "");
  let loading = $state(true);
  let i18n = $state<I18nData>({
    detected: false,
    localeDir: "",
    defaultLocale: "en",
    locales: [],
    usedKeys: [],
    coverage: [],
  });

  // Locales tab state
  let searchKey = $state("");
  let editingKey = $state<string | null>(null);
  let editValue = $state("");
  let addKeyInput = $state("");
  let addKeyDefault = $state("");
  let showAddKey = $state(false);

  // Coverage tab state
  let selectedMissingLocale = $state<string>("");

  function switchSub(s: string) {
    activeSub = s;
    vscode.setState({ ...vscode.getState(), i18nSub: s });
  }

  function switchLocale(l: string) {
    activeLocale = l;
    editingKey = null;
    vscode.setState({ ...vscode.getState(), i18nLocale: l });
  }

  function refresh() {
    loading = true;
    vscode.postMessage({ type: "i18n_refresh" });
  }

  function openFile(filePath: string) {
    vscode.postMessage({ type: "i18n_openFile", filePath });
  }

  function startEdit(key: string, value: string) {
    editingKey = key;
    editValue = value;
  }

  function cancelEdit() {
    editingKey = null;
    editValue = "";
  }

  function saveEdit(filePath: string, key: string) {
    vscode.postMessage({ type: "i18n_saveTranslation", filePath, key, value: editValue });
    editingKey = null;
  }

  function addKey() {
    if (!addKeyInput.trim()) return;
    vscode.postMessage({ type: "i18n_addKey", key: addKeyInput.trim(), defaultValue: addKeyDefault.trim() });
    addKeyInput = "";
    addKeyDefault = "";
    showAddKey = false;
  }

  function deleteKey(key: string) {
    vscode.postMessage({ type: "i18n_deleteKey", key });
  }

  let currentLocale = $derived(i18n.locales.find(l => l.locale === activeLocale) ?? i18n.locales[0]);

  let allKeys = $derived(
    Array.from(new Set(i18n.locales.flatMap(l => Object.keys(l.keys)))).sort()
  );

  let filteredKeys = $derived(
    searchKey.trim()
      ? allKeys.filter(k => k.toLowerCase().includes(searchKey.toLowerCase()) ||
          (currentLocale?.keys[k] ?? "").toLowerCase().includes(searchKey.toLowerCase()))
      : allKeys
  );

  let selectedCoverage = $derived(
    i18n.coverage.find(c => c.locale === selectedMissingLocale) ?? i18n.coverage[0]
  );

  let listener: ((e: MessageEvent) => void) | null = null;

  onMount(() => {
    listener = (e: MessageEvent) => {
      if (e.data?.type === "i18nUpdated") {
        i18n = e.data.i18n as I18nData;
        loading = false;
        if (!activeLocale && i18n.locales.length > 0) {
          activeLocale = i18n.defaultLocale || i18n.locales[0].locale;
        }
        if (!selectedMissingLocale && i18n.coverage.length > 0) {
          selectedMissingLocale = i18n.coverage[0].locale;
        }
      }
    };
    window.addEventListener("message", listener);
    refresh();
  });

  onDestroy(() => {
    if (listener) window.removeEventListener("message", listener);
  });

  function coverageColor(pct: number): string {
    if (pct >= 90) return "var(--color-status-done)";
    if (pct >= 60) return "var(--color-status-wip)";
    return "var(--color-status-blocked)";
  }
</script>

<div class="i18n-root">
  <!-- ── Sub-tab bar ─────────────────────────────────────────── -->
  <div class="sub-tabs">
    {#each [
      { id: "locales", icon: "📝", label: "Locales" },
      { id: "scanner", icon: "🔍", label: "Scanner" },
      { id: "coverage", icon: "📊", label: "Coverage" },
    ] as tab}
      <button class="sub-tab" class:active={activeSub === tab.id} onclick={() => switchSub(tab.id)}>
        <span>{tab.icon}</span><span>{tab.label}</span>
        {#if tab.id === "locales" && i18n.locales.length > 0}
          <span class="sub-count">{i18n.locales.length}</span>
        {/if}
        {#if tab.id === "scanner" && i18n.usedKeys.length > 0}
          <span class="sub-count">{i18n.usedKeys.length}</span>
        {/if}
      </button>
    {/each}
    <div class="sub-spacer"></div>
    <button class="icon-btn" onclick={refresh} title="Refresh">↻</button>
  </div>

  <!-- ── Loading ────────────────────────────────────────────── -->
  {#if loading}
    <div class="empty-state">
      <span class="empty-emoji">🌍</span>
      <span class="empty-title">Scanning translations…</span>
    </div>

  <!-- ── Not detected ───────────────────────────────────────── -->
  {:else if !i18n.detected && activeSub !== "scanner"}
    <div class="empty-state">
      <span class="empty-emoji">📂</span>
      <span class="empty-title">No locale directory found</span>
      <span class="empty-hint">Expected: <code>src/locales/</code>, <code>public/locales/</code>, or <code>locales/</code></span>
      <span class="empty-hint">Create a <code>locales/en.json</code> file to get started.</span>
    </div>

  <!-- ══ LOCALES TAB ═══════════════════════════════════════════ -->
  {:else if activeSub === "locales"}
    <div class="locale-layout">
      <!-- Locale picker -->
      <div class="locale-pills">
        {#each i18n.locales as loc}
          <button
            class="locale-pill"
            class:active={activeLocale === loc.locale}
            onclick={() => switchLocale(loc.locale)}
          >
            {loc.locale}
            {#if loc.locale === i18n.defaultLocale}
              <span class="default-badge">default</span>
            {/if}
          </button>
        {/each}
        {#if i18n.localeDir}
          <button class="locale-pill open-btn" onclick={() => openFile(i18n.localeDir)} title="Open locale directory">
            📁
          </button>
        {/if}
      </div>

      {#if currentLocale}
        <!-- Toolbar -->
        <div class="toolbar">
          <input
            class="search-input"
            type="text"
            placeholder="Filter keys…"
            bind:value={searchKey}
          />
          <button class="icon-btn" onclick={() => { openFile(currentLocale!.filePath); }} title="Open file">📄</button>
          <button class="icon-btn primary" onclick={() => { showAddKey = !showAddKey; }} title="Add key">＋</button>
        </div>

        <!-- Add key form -->
        {#if showAddKey}
          <div class="add-key-form">
            <input class="add-input" type="text" placeholder="Key (dot.notation)" bind:value={addKeyInput} />
            <input class="add-input" type="text" placeholder="Default value (for {i18n.defaultLocale})" bind:value={addKeyDefault} />
            <div class="add-actions">
              <button class="btn primary sm" onclick={addKey}>Add to all locales</button>
              <button class="btn sm" onclick={() => { showAddKey = false; addKeyInput = ""; addKeyDefault = ""; }}>Cancel</button>
            </div>
          </div>
        {/if}

        <!-- Key list -->
        <div class="key-list">
          {#if filteredKeys.length === 0}
            <div class="empty-inner">No keys match</div>
          {/if}
          {#each filteredKeys as key (key)}
            {@const val = currentLocale.keys[key] ?? ""}
            {@const missing = !val || val.trim() === ""}
            <div class="key-row" class:missing>
              <div class="key-meta">
                <span class="key-name">{key}</span>
                {#if missing}<span class="missing-badge">missing</span>{/if}
              </div>
              {#if editingKey === key}
                <div class="edit-row">
                  <textarea class="edit-textarea" bind:value={editValue} rows={2}></textarea>
                  <div class="edit-actions">
                    <button class="btn primary sm" onclick={() => saveEdit(currentLocale!.filePath, key)}>Save</button>
                    <button class="btn sm" onclick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              {:else}
                <div class="value-row">
                  <span class="key-value" class:empty-val={missing}>{missing ? "(empty)" : val}</span>
                  <button class="icon-btn xs" onclick={() => startEdit(key, val)} title="Edit">✏️</button>
                  <button class="icon-btn xs danger" onclick={() => deleteKey(key)} title="Delete">🗑</button>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="locale-footer">
          {filteredKeys.length} of {allKeys.length} keys · {currentLocale.locale}
        </div>
      {:else}
        <div class="empty-state">
          <span class="empty-hint">No locale loaded yet.</span>
        </div>
      {/if}
    </div>

  <!-- ══ SCANNER TAB ════════════════════════════════════════════ -->
  {:else if activeSub === "scanner"}
    <div class="scanner-layout">
      <div class="scanner-header">
        <span class="scanner-title">Keys found in source code</span>
        <span class="scanner-count">{i18n.usedKeys.length} keys</span>
      </div>

      {#if i18n.usedKeys.length === 0}
        <div class="empty-state">
          <span class="empty-emoji">🔍</span>
          <span class="empty-title">No i18n key calls found</span>
          <span class="empty-hint">Uses patterns: <code>t('key')</code>, <code>$t('key')</code>, <code>i18n.t('key')</code></span>
        </div>
      {:else}
        <div class="key-list compact">
          {#each i18n.usedKeys as key (key)}
            {@const inAllLocales = i18n.locales.every(l => l.keys[key] && l.keys[key].trim() !== "")}
            {@const missingFrom = i18n.locales.filter(l => !l.keys[key] || l.keys[key].trim() === "").map(l => l.locale)}
            <div class="key-row" class:missing={missingFrom.length > 0}>
              <div class="key-meta">
                <span class="key-name">{key}</span>
                {#if !inAllLocales && missingFrom.length > 0}
                  <span class="missing-badge">missing in: {missingFrom.join(", ")}</span>
                {:else}
                  <span class="ok-badge">✓ all locales</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if i18n.locales.length > 0}
        <div class="scanner-hint">
          <span>📦 Locale dir: <code>{i18n.localeDir || "(not found)"}</code></span>
        </div>
      {/if}
    </div>

  <!-- ══ COVERAGE TAB ══════════════════════════════════════════ -->
  {:else if activeSub === "coverage"}
    <div class="coverage-layout">
      <!-- Summary bars -->
      <div class="coverage-bars">
        {#each i18n.coverage as entry (entry.locale)}
          <button class="cov-row" class:active={selectedMissingLocale === entry.locale} onclick={() => selectedMissingLocale = entry.locale}>
            <div class="cov-meta">
              <span class="cov-locale">{entry.locale}</span>
              <span class="cov-pct" style:color={coverageColor(entry.percentage)}>{entry.percentage}%</span>
            </div>
            <div class="cov-bar-track">
              <div class="cov-bar-fill" style:width="{entry.percentage}%" style:background={coverageColor(entry.percentage)}></div>
            </div>
            <div class="cov-nums">{entry.translated}/{entry.total} keys</div>
          </button>
        {/each}
      </div>

      <!-- Missing key list for selected locale -->
      {#if selectedCoverage && selectedCoverage.missing.length > 0}
        <div class="missing-section">
          <div class="missing-header">
            Missing in <strong>{selectedCoverage.locale}</strong> ({selectedCoverage.missing.length})
          </div>
          <div class="key-list compact">
            {#each selectedCoverage.missing as key (key)}
              <div class="key-row missing">
                <span class="key-name">{key}</span>
                <button
                  class="icon-btn xs"
                  title="Edit in Locales tab"
                  onclick={() => { activeLocale = selectedMissingLocale; switchSub("locales"); searchKey = key; }}
                >→</button>
              </div>
            {/each}
          </div>
        </div>
      {:else if selectedCoverage}
        <div class="empty-inner success">✅ {selectedCoverage.locale} is fully translated</div>
      {/if}

      {#if i18n.coverage.length === 0}
        <div class="empty-state">
          <span class="empty-emoji">📊</span>
          <span class="empty-title">No locales detected</span>
          <span class="empty-hint">Add locale JSON files to see coverage</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .i18n-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  /* ── Sub-tabs ─────────────────────────────────────────────── */
  .sub-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 8px 0;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 30%, transparent);
    flex-shrink: 0;
  }

  .sub-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: none;
    border-radius: 6px 6px 0 0;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
  }
  .sub-tab:hover { background: var(--color-accent); color: var(--color-foreground); }
  .sub-tab.active {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    border-bottom: 2px solid var(--color-primary);
  }

  .sub-count {
    padding: 0 4px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-primary) 20%, transparent);
    color: var(--color-primary);
    font-size: 9px;
    font-weight: 700;
  }

  .sub-spacer { flex: 1; }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px 6px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.12s ease;
    font-family: inherit;
  }
  .icon-btn:hover { background: var(--color-accent); color: var(--color-foreground); }
  .icon-btn.primary { color: var(--color-primary); }
  .icon-btn.danger:hover { background: color-mix(in srgb, var(--color-status-blocked) 15%, transparent); color: var(--color-status-blocked); }
  .icon-btn.xs { padding: 2px 4px; font-size: 10px; }

  /* ── Empty states ─────────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 32px 16px;
    text-align: center;
    flex: 1;
  }
  .empty-emoji { font-size: 28px; }
  .empty-title { font-size: 12px; font-weight: 600; color: var(--color-foreground); }
  .empty-hint { font-size: 10px; color: var(--color-muted-foreground); }
  .empty-hint code { background: color-mix(in srgb, var(--color-muted) 50%, transparent); padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 9px; }

  .empty-inner {
    padding: 16px;
    text-align: center;
    font-size: 11px;
    color: var(--color-muted-foreground);
  }
  .empty-inner.success { color: var(--color-status-done); }

  /* ── Locale layout ────────────────────────────────────────── */
  .locale-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .locale-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px 8px 6px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .locale-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border: 1px solid var(--color-border);
    border-radius: 99px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
  }
  .locale-pill:hover { border-color: var(--color-primary); color: var(--color-foreground); }
  .locale-pill.active {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
  .locale-pill.open-btn { padding: 3px 8px; }

  .default-badge {
    padding: 0 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-status-done) 15%, transparent);
    color: var(--color-status-done);
    font-size: 8px;
    font-weight: 700;
  }

  /* ── Toolbar ──────────────────────────────────────────────── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input);
    color: var(--color-foreground);
    font-size: 11px;
    font-family: inherit;
    outline: none;
  }
  .search-input:focus { border-color: var(--color-primary); }

  /* ── Add key form ─────────────────────────────────────────── */
  .add-key-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    flex-shrink: 0;
  }

  .add-input {
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input);
    color: var(--color-foreground);
    font-size: 11px;
    font-family: monospace;
    outline: none;
  }
  .add-input:focus { border-color: var(--color-primary); }

  .add-actions {
    display: flex;
    gap: 4px;
  }

  /* ── Buttons ──────────────────────────────────────────────── */
  .btn {
    padding: 4px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-muted);
    color: var(--color-foreground);
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.12s ease;
  }
  .btn:hover { background: var(--color-accent); }
  .btn.primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-color: var(--color-primary);
  }
  .btn.primary:hover { opacity: 0.9; }
  .btn.sm { padding: 3px 8px; font-size: 10px; }

  /* ── Key list ─────────────────────────────────────────────── */
  .key-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .key-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);
    transition: background 0.1s ease;
  }
  .key-row:hover { background: color-mix(in srgb, var(--color-accent) 50%, transparent); }
  .key-row.missing { background: color-mix(in srgb, var(--color-status-blocked) 5%, transparent); }

  .key-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .key-name {
    font-family: monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-foreground);
    word-break: break-all;
  }

  .missing-badge {
    padding: 1px 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-status-blocked) 15%, transparent);
    color: var(--color-status-blocked);
    font-size: 8px;
    font-weight: 700;
  }

  .ok-badge {
    padding: 1px 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-status-done) 15%, transparent);
    color: var(--color-status-done);
    font-size: 8px;
    font-weight: 700;
  }

  .value-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .key-value {
    flex: 1;
    font-size: 10px;
    color: var(--color-muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .key-value.empty-val {
    font-style: italic;
    color: color-mix(in srgb, var(--color-muted-foreground) 60%, transparent);
  }

  .edit-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .edit-textarea {
    width: 100%;
    padding: 4px 6px;
    border: 1px solid var(--color-primary);
    border-radius: 4px;
    background: var(--color-input);
    color: var(--color-foreground);
    font-size: 11px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }

  .edit-actions {
    display: flex;
    gap: 4px;
  }

  .locale-footer {
    padding: 4px 10px;
    border-top: 1px solid var(--color-border);
    font-size: 9px;
    color: var(--color-muted-foreground);
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Scanner ──────────────────────────────────────────────── */
  .scanner-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .scanner-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .scanner-title { font-size: 11px; font-weight: 600; color: var(--color-foreground); }
  .scanner-count {
    padding: 2px 6px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    font-size: 9px;
    font-weight: 700;
  }

  .scanner-hint {
    padding: 8px 10px;
    font-size: 9px;
    color: var(--color-muted-foreground);
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .scanner-hint code { font-family: monospace; background: color-mix(in srgb, var(--color-muted) 50%, transparent); padding: 1px 3px; border-radius: 3px; }

  .key-list.compact .key-row {
    flex-direction: row;
    align-items: center;
    padding: 5px 10px;
  }
  .key-list.compact .key-meta { flex: 1; }

  /* ── Coverage ─────────────────────────────────────────────── */
  .coverage-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    gap: 0;
  }

  .coverage-bars {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .cov-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
    background: none;
    text-align: left;
    width: 100%;
    font-family: inherit;
    transition: all 0.1s ease;
  }
  .cov-row:hover { background: var(--color-accent); }
  .cov-row.active { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 8%, transparent); }

  .cov-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .cov-locale { font-size: 11px; font-weight: 700; color: var(--color-foreground); }
  .cov-pct { font-size: 11px; font-weight: 700; }

  .cov-bar-track {
    height: 4px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-muted) 60%, transparent);
    overflow: hidden;
  }

  .cov-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  .cov-nums {
    font-size: 9px;
    color: var(--color-muted-foreground);
  }

  .missing-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .missing-header {
    padding: 8px 10px 6px;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-muted-foreground);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
</style>
