import type { Board } from "@agent-kanban/core";
import { styles } from "./styles.js";
import { renderKanbanPanel } from "./panel-kanban.js";
import { renderWorkflowPanel } from "./panel-workflow.js";
import { renderMonitorPanel } from "./panel-monitor.js";

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
  function compoundLearnings(id) { vscode.postMessage({ type: 'compoundLearnings', taskId: id }); }

  // ── Git automation ────────────────────────────────────────────
  function worktreeCreate(id)    { vscode.postMessage({ type: 'worktreeCreate', taskId: id }); }
  function worktreeCleanup(id)   { vscode.postMessage({ type: 'worktreeCleanup', taskId: id }); }
  function createPr(id)          { vscode.postMessage({ type: 'createPr', taskId: id }); }
  function startFeatureLoop(id)  { vscode.postMessage({ type: 'startFeatureLoop', taskId: id }); }

  // ── Workflow actions ───────────────────────────────────────────
  function planFeature()         { vscode.postMessage({ type: 'planFeature' }); }
  function requestReview(type)   { vscode.postMessage({ type: 'requestReview', reviewType: type }); }
  function setupMcp(target)       { vscode.postMessage({ type: 'setupMcpServer', target: target || 'vscode' }); }
  function reloadWindow()        { vscode.postMessage({ type: 'reloadWindow' }); }
  function openDocs()            { vscode.postMessage({ type: 'openDocs' }); }
  function setMemory(backend) {
    document.getElementById('mem-sqlite').classList.toggle('active', backend === 'sqlite');
    document.getElementById('mem-files').classList.toggle('active', backend === 'files');
    vscode.postMessage({ type: 'setMemoryBackend', backend });
  }

  // ── Workflow collapsible sections ──────────────────────────────
  function toggleSetup(id) {
    document.getElementById(id).classList.toggle('open');
  }

  // ── Monitor actions ────────────────────────────────────────────
  function clearSession() { vscode.postMessage({ type: 'clearSession' }); }

  // ── Memory Monitor listener ────────────────────────────────────
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (msg.type !== 'sessionSnapshot') return;
    const entries = msg.entries || [];
    const summary = msg.summary || {};

    // Animate tab badge
    const badge = document.getElementById('tab-memory-badge');
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
      const name = e.filePath.split(/[\\\\\\/]/).pop();
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
 * Tabs: 📋 Kanban | 🔄 Workflow | 🧠 Memory
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
  <div class="tab-bar">
    <button class="tab-btn active" id="tab-kanban" onclick="switchTab('kanban')">📋 Kanban</button>
    <button class="tab-btn" id="tab-workflow" onclick="switchTab('workflow')">🔄 Workflow</button>
    <button class="tab-btn" id="tab-memory" onclick="switchTab('memory')">🧠 Memory <span id="tab-memory-badge" style="display:none;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);font-size:9px;padding:1px 5px;border-radius:8px;margin-left:2px"></span></button>
  </div>

  <div class="tab-panel active" id="panel-kanban">
    ${renderKanbanPanel(board)}
  </div>

  <div class="tab-panel" id="panel-workflow">
    ${renderWorkflowPanel()}
  </div>

  <div class="tab-panel" id="panel-memory">
    ${renderMonitorPanel()}
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
