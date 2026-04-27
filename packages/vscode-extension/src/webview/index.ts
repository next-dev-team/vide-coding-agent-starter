import type { Board } from "@agent-kanban/core";
import { styles } from "./styles.js";
import { renderKanbanPanel, renderColumnPanel, renderWorkflowPanel } from "./panel-kanban.js";
import { renderMonitorPanel } from "./panel-monitor.js";
import { renderSettingsPanel } from "./panel-settings.js";

// ── Client-side JS ────────────────────────────────────────────────────────────

const FULL_SCRIPTS = /*js*/ `
  const vscode = acquireVsCodeApi();

  // ── Tab switching ──────────────────────────────────────────────
  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
    const s = vscode.getState() || {};
    vscode.setState({ ...s, activeTab: name });
  }
  (function restoreTab() {
    const s = vscode.getState() || {};
    if (s.activeTab && s.activeTab !== 'kanban') switchTab(s.activeTab);
  })();

  // ── Kanban accordion ───────────────────────────────────────────
  const savedState = vscode.getState() || {};
  const collapseState = savedState.collapseState || {};
  document.querySelectorAll('.section').forEach(sec => {
    const status = sec.dataset.status;
    if (status in collapseState) sec.classList.toggle('open', collapseState[status]);
  });
  function toggleSection(status) {
    const sec = document.getElementById('section-' + status);
    const isOpen = sec.classList.toggle('open');
    const state = vscode.getState() || {};
    const cs = state.collapseState || {};
    cs[status] = isOpen;
    vscode.setState({ ...state, collapseState: cs });
  }

  // ── Kanban actions ─────────────────────────────────────────────
  function refresh()             { vscode.postMessage({ type: 'refresh' }); }
  function openFile(filename)    { vscode.postMessage({ type: 'openFile', filename }); }
  function moveTask(id, status)  { vscode.postMessage({ type: 'moveTask', taskId: id, newStatus: status }); }
  function planFeature()         { vscode.postMessage({ type: 'planFeature' }); }
  function requestReview(type)   { vscode.postMessage({ type: 'requestReview', reviewType: type }); }
  function compoundLearnings(id) { vscode.postMessage({ type: 'compoundLearnings', taskId: id }); }

  // ── Monitor actions ────────────────────────────────────────────
  function clearSession() { vscode.postMessage({ type: 'clearSession' }); }

  // ── Settings actions ───────────────────────────────────────────
  function toggleSetup(id)  { document.getElementById(id).classList.toggle('open'); }
  function setupMcp()       { vscode.postMessage({ type: 'setupMcpServer' }); }
  function reloadWindow()   { vscode.postMessage({ type: 'reloadWindow' }); }
  function openDocs()       { vscode.postMessage({ type: 'openDocs' }); }
  function setMemory(backend) {
    document.getElementById('mem-sqlite').classList.toggle('active', backend === 'sqlite');
    document.getElementById('mem-files').classList.toggle('active', backend === 'files');
    vscode.postMessage({ type: 'setMemoryBackend', backend });
  }

  // ── Memory Monitor listener ────────────────────────────────────
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (msg.type !== 'sessionSnapshot') return;
    const entries = msg.entries || [];
    const summary = msg.summary || {};

    // Animate tab badge
    const badge = document.getElementById('tab-monitor-badge');
    if (badge) {
      badge.textContent = entries.length;
      badge.style.display = entries.length > 0 ? '' : 'none';
    }

    const empty     = document.getElementById('monitor-empty');
    const table     = document.getElementById('monitor-table');
    const rows      = document.getElementById('monitor-rows');
    const totalUsed = document.getElementById('monitor-total-used');
    const totalSaved= document.getElementById('monitor-total-saved');
    if (!empty) return;

    if (entries.length === 0) { empty.style.display = ''; table.style.display = 'none'; return; }
    empty.style.display = 'none';
    table.style.display = '';

    rows.innerHTML = entries.map(function(e) {
      const name = e.filePath.split(/[\\\\/]/).pop();
      const saved = e.fullTokenCount - e.tokensUsed;
      const tc = e.tierLoaded === 'L2' ? 'var(--vscode-charts-red)'
               : e.tierLoaded === 'L1' ? 'var(--vscode-charts-yellow)'
               : 'var(--vscode-charts-green)';
      return '<tr>'
        + '<td style="padding:3px 2px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + e.filePath + '">' + name + '</td>'
        + '<td style="padding:3px 2px;color:' + tc + ';font-weight:600">' + e.tierLoaded + '</td>'
        + '<td style="padding:3px 2px;text-align:right">' + e.tokensUsed + ' tk</td>'
        + '<td style="padding:3px 2px;text-align:right;color:var(--vscode-charts-green)">' + (saved > 0 ? '+' + saved : saved) + ' tk</td>'
        + '</tr>';
    }).join('');
    totalUsed.textContent  = (summary.totalTokensUsed  || 0) + ' tk';
    totalSaved.textContent = '+' + (summary.totalTokensSaved || 0) + ' tk';
  });
`;

// ── HTML assembler ────────────────────────────────────────────────────────────

/**
 * Builds the full single-webview HTML with a horizontal tab bar at the top.
 * Tabs: 📋 Kanban | 🔍 Monitor | ⚙️ Settings
 */
export function getHtml(board: Board): string {
  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  <!-- Horizontal tab bar -->
  <div class="tab-bar" style="overflow-x: auto; white-space: nowrap; padding-bottom: 2px;">
    <button class="tab-btn active" id="tab-kanban" onclick="switchTab('kanban')">📋 Kanban</button>
    <button class="tab-btn" id="tab-todo" onclick="switchTab('todo')">🔵 Todo</button>
    <button class="tab-btn" id="tab-wip" onclick="switchTab('wip')">🟡 WIP</button>
    <button class="tab-btn" id="tab-blocked" onclick="switchTab('blocked')">🔴 Blocked</button>
    <button class="tab-btn" id="tab-done" onclick="switchTab('done')">🟢 Done</button>
    <button class="tab-btn" id="tab-workflow" onclick="switchTab('workflow')">⚡ Workflow</button>
    <button class="tab-btn" id="tab-monitor" onclick="switchTab('monitor')">🔍 Memory <span id="tab-monitor-badge" style="display:none;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);font-size:9px;padding:1px 5px;border-radius:8px;margin-left:2px"></span></button>
    <button class="tab-btn" id="tab-settings" onclick="switchTab('settings')">⚙️ Settings</button>
  </div>

  <div class="tab-panel active" id="panel-kanban">
    ${renderKanbanPanel(board)}
  </div>

  <div class="tab-panel" id="panel-todo">
    ${renderColumnPanel(board, 'todo')}
  </div>

  <div class="tab-panel" id="panel-wip">
    ${renderColumnPanel(board, 'wip')}
  </div>

  <div class="tab-panel" id="panel-blocked">
    ${renderColumnPanel(board, 'blocked')}
  </div>

  <div class="tab-panel" id="panel-done">
    ${renderColumnPanel(board, 'done')}
  </div>

  <div class="tab-panel" id="panel-workflow">
    ${renderWorkflowPanel()}
  </div>

  <div class="tab-panel" id="panel-monitor">
    ${renderMonitorPanel()}
  </div>

  <div class="tab-panel" id="panel-settings">
    ${renderSettingsPanel()}
  </div>

  <script>${FULL_SCRIPTS}</script>
</body>
</html>`;
}

/** Error page shown when board scan fails. */
export function getErrorHtml(): string {
  return /*html*/ `<!DOCTYPE html>
<html>
<body style="font-family:var(--vscode-font-family);padding:16px;color:var(--vscode-foreground)">
  <p>Could not load board.</p>
  <p style="opacity:0.6;font-size:12px">Make sure <code>docs/tasks/</code> exists in your workspace.</p>
</body>
</html>`;
}
