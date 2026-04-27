/** All webview client-side JavaScript as a single string. */
export const scripts = /*js*/ `
  const vscode = acquireVsCodeApi();

  // ── Tab switching ────────────────────────────────────────────
  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
    const s = vscode.getState() || {};
    vscode.setState({ ...s, activeTab: name });
  }
  // Restore last active tab on load
  (function() {
    const s = vscode.getState() || {};
    if (s.activeTab && s.activeTab !== 'kanban') switchTab(s.activeTab);
  })();

  // ── Settings accordion ────────────────────────────────────────
  function toggleSetup(id) {
    document.getElementById(id).classList.toggle('open');
  }

  // ── Settings actions ──────────────────────────────────────────
  function setupMcp()     { vscode.postMessage({ type: 'setupMcpServer' }); }
  function reloadWindow() { vscode.postMessage({ type: 'reloadWindow' }); }
  function openDocs()     { vscode.postMessage({ type: 'openDocs' }); }
  function setMemory(backend) {
    document.getElementById('mem-sqlite').classList.toggle('active', backend === 'sqlite');
    document.getElementById('mem-files').classList.toggle('active', backend === 'files');
    vscode.postMessage({ type: 'setMemoryBackend', backend });
  }

  // ── Kanban accordion ──────────────────────────────────────────
  const savedState = vscode.getState() || {};
  const collapseState = savedState.collapseState || {};

  document.querySelectorAll('.section').forEach(sec => {
    const status = sec.dataset.status;
    if (status in collapseState) {
      sec.classList.toggle('open', collapseState[status]);
    }
  });

  function toggleSection(status) {
    const sec = document.getElementById('section-' + status);
    const isOpen = sec.classList.toggle('open');
    const state = vscode.getState() || {};
    const cs = state.collapseState || {};
    cs[status] = isOpen;
    vscode.setState({ ...state, collapseState: cs });
  }

  // ── Kanban actions ────────────────────────────────────────────
  function refresh()              { vscode.postMessage({ type: 'refresh' }); }
  function openFile(filename)     { vscode.postMessage({ type: 'openFile', filename }); }
  function moveTask(id, status)   { vscode.postMessage({ type: 'moveTask', taskId: id, newStatus: status }); }
  function clearSession()         { vscode.postMessage({ type: 'clearSession' }); }
  function planFeature()          { vscode.postMessage({ type: 'planFeature' }); }
  function requestReview(type)    { vscode.postMessage({ type: 'requestReview', reviewType: type }); }
  function compoundLearnings(id)  { vscode.postMessage({ type: 'compoundLearnings', taskId: id }); }
  function openMemoryConfig()     { vscode.postMessage({ type: 'openMemoryConfig' }); }

  // ── Memory Monitor (receives push from extension) ─────────────
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (msg.type !== 'sessionSnapshot') return;
    const entries = msg.entries || [];
    const summary = msg.summary || {};

    const tabBadge = document.getElementById('tab-monitor-badge');
    if (tabBadge) {
      if (entries.length > 0) { tabBadge.textContent = entries.length; tabBadge.style.display = ''; }
      else { tabBadge.style.display = 'none'; }
    }
    const empty     = document.getElementById('monitor-empty');
    const table     = document.getElementById('monitor-table');
    const rows      = document.getElementById('monitor-rows');
    const totalUsed = document.getElementById('monitor-total-used');
    const totalSaved= document.getElementById('monitor-total-saved');

    if (entries.length === 0) { empty.style.display = ''; table.style.display = 'none'; return; }
    empty.style.display = 'none';
    table.style.display = '';

    rows.innerHTML = entries.map(function(e) {
      const name = e.filePath.split(/[\\\\/]/).pop();
      const saved = e.fullTokenCount - e.tokensUsed;
      const tierColor = e.tierLoaded === 'L2' ? 'var(--vscode-charts-red)'
        : e.tierLoaded === 'L1' ? 'var(--vscode-charts-yellow)'
        : 'var(--vscode-charts-green)';
      return '<tr>'
        + '<td style="padding:3px 2px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + e.filePath + '">' + name + '</td>'
        + '<td style="padding:3px 2px;color:' + tierColor + ';font-weight:600">' + e.tierLoaded + '</td>'
        + '<td style="padding:3px 2px;text-align:right">' + e.tokensUsed + ' tk</td>'
        + '<td style="padding:3px 2px;text-align:right;color:var(--vscode-charts-green)">' + (saved > 0 ? '+' + saved : saved) + ' tk</td>'
        + '</tr>';
    }).join('');

    totalUsed.textContent  = (summary.totalTokensUsed  || 0) + ' tk';
    totalSaved.textContent = '+' + (summary.totalTokensSaved || 0) + ' tk';
  });
`;
