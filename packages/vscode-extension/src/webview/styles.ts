/** All webview CSS styles as a single string. */
export const styles = /*css*/ `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 0;
  }

  /* ── Tab bar ──────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorWidget-background);
    padding: 0 8px;
    gap: 2px;
  }
  .tab-btn {
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.55;
    transition: opacity 0.15s, border-color 0.15s;
  }
  .tab-btn:hover { opacity: 0.85; }
  .tab-btn.active {
    opacity: 1;
    border-bottom-color: var(--vscode-focusBorder);
  }
  .tab-panel { display: none; padding: 12px; }
  .tab-panel.active { display: block; }

  /* ── Settings panel ───────────────────────────────────────── */
  .setup-section {
    margin-bottom: 10px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
  }
  .setup-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--vscode-editorWidget-background);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    user-select: none;
  }
  .setup-section-header:hover { background: var(--vscode-list-hoverBackground); }
  .setup-section-header .chevron { font-size: 11px; opacity: 0.6; transition: transform 0.2s; }
  .setup-section.open .setup-section-header .chevron { transform: rotate(90deg); }
  .setup-section-body { display: none; padding: 10px; font-size: 12px; }
  .setup-section.open .setup-section-body { display: block; }

  .setup-label { font-size: 11px; opacity: 0.65; margin-bottom: 6px; line-height: 1.5; }
  .setup-btn {
    width: 100%;
    padding: 7px 0;
    margin-top: 6px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .setup-btn:hover { opacity: 0.85; }
  .setup-btn.secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .mem-toggle { display: flex; gap: 6px; margin-top: 6px; }
  .mem-toggle button {
    flex: 1;
    padding: 5px 0;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    transition: all 0.15s;
  }
  .mem-toggle button:hover,
  .mem-toggle button.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .step-list { padding-left: 16px; margin: 6px 0; opacity: 0.8; line-height: 1.8; }

  /* ── Shared header ────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }
  .header h2 { font-size: 14px; font-weight: 600; letter-spacing: 0.5px; }
  .header .count { font-size: 11px; opacity: 0.6; }
  .btn-refresh {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.6;
    font-size: 14px;
  }
  .btn-refresh:hover { opacity: 1; }

  /* ── Accordion sections ───────────────────────────────────── */
  .section {
    margin-bottom: 8px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    cursor: pointer;
    user-select: none;
    background: var(--vscode-editorWidget-background);
    transition: background 0.15s;
  }
  .section-header:hover { background: var(--vscode-list-hoverBackground); }
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .section-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .section[data-status="todo"]    .section-dot { background: var(--vscode-charts-blue); }
  .section[data-status="wip"]     .section-dot { background: var(--vscode-charts-yellow); }
  .section[data-status="done"]    .section-dot { background: var(--vscode-charts-green); }
  .section[data-status="blocked"] .section-dot { background: var(--vscode-charts-red); }
  .section-meta { display: flex; align-items: center; gap: 8px; }
  .badge {
    font-size: 10px;
    font-weight: 600;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 1px 7px;
    border-radius: 10px;
  }
  .chevron { font-size: 11px; opacity: 0.6; transition: transform 0.2s ease; display: inline-block; }
  .section.open .chevron { transform: rotate(90deg); }
  .section-body {
    display: none;
    padding: 8px;
    background: var(--vscode-sideBar-background);
    animation: fadeIn 0.15s ease-in-out;
  }
  .section.open .section-body { display: block; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-2px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Cards ────────────────────────────────────────────────── */
  .card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid transparent;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .card:last-child { margin-bottom: 0; }
  .card:hover {
    border-right-color: var(--vscode-focusBorder);
    border-top-color: var(--vscode-focusBorder);
    border-bottom-color: var(--vscode-focusBorder);
    background: var(--vscode-list-hoverBackground);
  }
  .card[data-status="todo"]    { border-left-color: var(--vscode-charts-blue); }
  .card[data-status="wip"]     { border-left-color: var(--vscode-charts-yellow); }
  .card[data-status="done"]    { border-left-color: var(--vscode-charts-green); }
  .card[data-status="blocked"] { border-left-color: var(--vscode-charts-red); }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .card-id {
    font-size: 10px; font-weight: 600; opacity: 0.6;
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-editorWidget-background);
    padding: 2px 6px; border-radius: 4px;
  }
  .card-goal { font-size: 12px; line-height: 1.4; font-weight: 500; margin-top: 2px; }
  .card-progress { font-size: 10px; opacity: 0.7; display: flex; align-items: center; gap: 6px; }
  .progress-bar { flex: 1; height: 4px; background: var(--vscode-panel-border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--vscode-charts-green); border-radius: 2px; transition: width 0.3s; }
  .card-actions { display: flex; gap: 4px; margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--vscode-panel-border); }
  .move-btn {
    flex: 1; font-size: 10px; padding: 4px 0;
    border: 1px solid var(--vscode-panel-border); border-radius: 4px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer; text-transform: uppercase; font-weight: 600; transition: all 0.1s;
  }
  .move-btn:hover {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .git-btn {
    background: var(--vscode-editorWidget-background);
    border-style: dashed;
  }
  .empty {
    font-size: 12px; opacity: 0.5; font-style: italic;
    text-align: center; padding: 20px 0;
    border-radius: 4px; border: 1px dashed var(--vscode-panel-border);
  }

  /* ── Task table ───────────────────────────────────────────── */
  .tbl-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; padding: 3px 8px;
    border-radius: 10px; opacity: 0.9;
  }
  .tbl {
    width: 100%; border-collapse: collapse; font-size: 12px;
    table-layout: auto;
  }
  .tbl-th {
    text-align: left; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 6px 8px; border-bottom: 2px solid var(--vscode-panel-border);
    opacity: 0.6; white-space: nowrap;
  }
  .tbl-row {
    cursor: pointer;
    border-bottom: 1px solid var(--vscode-panel-border);
    transition: background 0.12s;
  }
  .tbl-row:hover { background: var(--vscode-list-hoverBackground); }
  .tbl-row td { padding: 7px 8px; vertical-align: middle; }
  .tbl-status {
    display: flex !important; align-items: center; gap: 5px;
    white-space: nowrap;
  }
  .tbl-dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; flex-shrink: 0;
  }
  .tbl-status-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.4px; opacity: 0.75;
  }
  .tbl-id code {
    font-family: var(--vscode-editor-font-family);
    font-size: 10px; opacity: 0.6;
    background: var(--vscode-editorWidget-background);
    padding: 2px 5px; border-radius: 3px;
  }
  .tbl-goal { line-height: 1.4; }
  .tbl-progress { white-space: nowrap; }
  .tbl-actions { white-space: nowrap; }
  .tbl-move {
    background: none; border: 1px solid var(--vscode-panel-border);
    border-radius: 4px; cursor: pointer; font-size: 13px;
    padding: 2px 4px; transition: background 0.1s;
    line-height: 1;
  }
  .tbl-move:hover { background: var(--vscode-button-secondaryBackground); }

  /* ── Workflow panel ──────────────────────────────────────── */
  .wf-group {
    margin-bottom: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
  }
  .wf-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--vscode-editorWidget-background);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    user-select: none;
  }
  .wf-group-title:hover { background: var(--vscode-list-hoverBackground); }
  .wf-group-body { padding: 10px; }
  .wf-row { display: flex; gap: 6px; margin-top: 6px; }
  .wf-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    font-size: 11px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .wf-btn:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
  }
  .wf-btn.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .wf-btn.primary:hover { opacity: 0.85; }
  .wf-btn.compact { padding: 6px 10px; }
  .wf-icon { font-size: 14px; flex-shrink: 0; }
  .wf-btn-text { display: flex; flex-direction: column; gap: 1px; }
  .wf-btn-label { font-weight: 600; font-size: 11px; }
  .wf-btn-desc { font-size: 10px; opacity: 0.6; }
  .wf-hint { font-size: 11px; opacity: 0.65; margin-bottom: 6px; line-height: 1.5; }

  /* ── Collapsible setup sections in Workflow tab ─────────── */
  .setup-collapsible { display: none; }
  .setup-collapsible.open { display: block; }
  .wf-group-title .chevron { transition: transform 0.2s ease; }
  .wf-group:has(.setup-collapsible.open) .wf-group-title .chevron { transform: rotate(90deg); }

  /* ── Sub-section titles inside workflow groups ─────────── */
  .wf-sub-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.55;
    margin: 2px 0 4px;
    padding-left: 2px;
  }

  /* ── Memory toggle buttons ────────────────────────────── */
  .mem-toggle {
    display: flex;
    gap: 4px;
  }
  .mem-toggle button {
    flex: 1;
    padding: 6px 0;
    font-size: 11px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    transition: all 0.15s;
  }
  .mem-toggle button:hover {
    border-color: var(--vscode-focusBorder);
  }
  .mem-toggle button.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }

  /* ── Skills panel ──────────────────────────────────────────── */
  .skill-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid var(--vscode-charts-blue);
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .skill-card:last-child { margin-bottom: 0; }
  .skill-card:hover {
    border-right-color: var(--vscode-focusBorder);
    border-top-color: var(--vscode-focusBorder);
    border-bottom-color: var(--vscode-focusBorder);
    background: var(--vscode-list-hoverBackground);
  }
  .skill-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 4px;
  }
  .skill-card-name {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .skill-card-desc {
    font-size: 11px;
    opacity: 0.7;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .skill-card-path {
    margin-top: 4px;
    font-size: 10px;
    opacity: 0.45;
  }
  .skill-card-path code {
    font-family: var(--vscode-editor-font-family);
    font-size: 10px;
  }
  .skill-format-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border-radius: 8px;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .skill-format-badge.local {
    background: color-mix(in srgb, var(--vscode-charts-green) 20%, transparent);
    color: var(--vscode-charts-green);
  }
  .skill-format-badge.vercel {
    background: color-mix(in srgb, var(--vscode-charts-purple, #a855f7) 20%, transparent);
    color: var(--vscode-charts-purple, #a855f7);
  }
  .skill-format-badge.cursor {
    background: color-mix(in srgb, var(--vscode-charts-blue) 20%, transparent);
    color: var(--vscode-charts-blue);
  }
  .skill-format-badge.copilot {
    background: color-mix(in srgb, var(--vscode-charts-orange, #f59e0b) 20%, transparent);
    color: var(--vscode-charts-orange, #f59e0b);
  }
  .skill-format-badge.claude {
    background: color-mix(in srgb, var(--vscode-charts-yellow) 20%, transparent);
    color: var(--vscode-charts-yellow);
  }
  .skill-agent-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .skill-agent-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    font-size: 11px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    transition: all 0.15s;
  }
  .skill-agent-row:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
  }
  .skill-agent-arrow {
    margin-left: auto;
    opacity: 0.4;
    font-size: 13px;
    transition: transform 0.15s, opacity 0.15s;
  }
  .skill-agent-row:hover .skill-agent-arrow {
    opacity: 0.8;
    transform: translateX(2px);
  }

  /* ── MCP Tool List ────────────────────────────────────────── */
  .mcp-tool-group {
    margin-bottom: 8px;
  }
  .mcp-tool-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s;
    position: relative;
  }
  .mcp-tool-row:hover {
    background: var(--vscode-list-hoverBackground);
  }
  .mcp-tool-row:active {
    background: var(--vscode-list-activeSelectionBackground);
  }
  .mcp-tool-name {
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    font-weight: 600;
    background: var(--vscode-editorWidget-background);
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 0;
  }
  .mcp-tool-desc {
    font-size: 10px;
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .mcp-copy-icon {
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .mcp-tool-row:hover .mcp-copy-icon {
    opacity: 0.6;
  }

  /* ── Copy toast ───────────────────────────────────────────── */
  .copy-toast {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%) translateY(40px);
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    z-index: 999;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .copy-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  /* ── AGENTS.md init checkboxes ────────────────────────────── */
  .agents-md-check {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    margin-bottom: 4px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    background: var(--vscode-editor-background);
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
  }
  .agents-md-check:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
  }
  .agents-md-check input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--vscode-button-background);
    cursor: pointer;
    flex-shrink: 0;
  }
  .agents-md-check-icon {
    font-size: 14px;
    flex-shrink: 0;
  }
  .agents-md-check-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .agents-md-check-label {
    font-weight: 600;
    font-size: 11px;
  }
  .agents-md-check-desc {
    font-size: 10px;
    opacity: 0.6;
  }
`;
