import * as vscode from "vscode";
import { scanBoard, moveTask } from "@agent-kanban/core";
import type { Board } from "@agent-kanban/core";

/** Provides the Kanban board webview in the sidebar. */
export class BoardViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  /** Session memory access snapshot — updated by clearSession or external push. */
  private _sessionSnapshot: Array<{ filePath: string; tierLoaded: string; tokensUsed: number; fullTokenCount: number; loadedAt: string }> = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly workspaceRoot: string,
  ) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "moveTask": {
          try {
            await moveTask(this.workspaceRoot, msg.taskId, msg.newStatus);
            this.refresh();
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to move task: ${err.message}`);
          }
          break;
        }
        case "openFile": {
          const uri = vscode.Uri.file(
            `${this.workspaceRoot}/docs/tasks/${msg.filename}`,
          );
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc);
          break;
        }
        case "refresh": {
          this.refresh();
          break;
        }
        case "clearSession": {
          this._sessionSnapshot = [];
          this._view?.webview.postMessage({
            type: "sessionSnapshot",
            entries: [],
            summary: { filesAccessed: 0, totalTokensUsed: 0, totalFullTokens: 0, totalTokensSaved: 0 },
          });
          break;
        }
        case "planFeature": {
          // Trigger the create PRD command flow
          vscode.commands.executeCommand("agentKanban.createPrd");
          break;
        }
        case "requestReview": {
          // Open a new untitled document with review context pre-filled
          const reviewType = (msg.reviewType as string) ?? "security";
          const label = reviewType === "performance" ? "Performance" : "Security";
          const uri = `kanban://review/${reviewType}`;
          const md = [
            `# ${label} Review Request`,
            "",
            `> Fetched from MCP resource: \`${uri}\``,
            "",
            `Run the following in your AI agent to start the review:`,
            "",
            "```",
            `Read the resource ${uri} and review the current staged changes against the checklist.`,
            "```",
          ].join("\n");
          const doc = await vscode.workspace.openTextDocument({
            content: md,
            language: "markdown",
          });
          await vscode.window.showTextDocument(doc, { preview: true });
          break;
        }
        case "compoundLearnings": {
          const taskId = msg.taskId as string | undefined;
          if (!taskId) break;
          const md = [
            `# Compound Learnings — Task ${taskId}`,
            "",
            "Run the following in your AI agent to extract and persist memories:",
            "",
            "```",
            `Call the MCP tool compound_learnings with task_id: "${taskId}" to extract reusable learnings, then call memory_overview to review the results.`,
            "```",
          ].join("\n");
          const doc = await vscode.workspace.openTextDocument({
            content: md,
            language: "markdown",
          });
          await vscode.window.showTextDocument(doc, { preview: true });
          break;
        }
        case "openMemoryConfig": {
          vscode.window.showInformationMessage(
            "Memory backend: use MCP tool `memory_config_set` with backend=\"sqlite\" or \"files\"",
          );
          break;
        }
      }
    });

    await this._updateWebview();
  }

  /** Refresh the board data. */
  async refresh() {
    await this._updateWebview();
  }

  private async _updateWebview() {
    if (!this._view) return;

    try {
      const board = await scanBoard(this.workspaceRoot);
      this._view.webview.html = this._getHtml(board);
    } catch {
      this._view.webview.html = this._getErrorHtml();
    }
  }

  private _getHtml(board: Board): string {
    const allStatuses = ["todo", "wip", "blocked", "done"];
    // Ensure we have all 4 columns even if empty
    const columns = allStatuses.map(status => {
      const existing = board.columns.find(c => c.status === status);
      return existing || { status, label: status.toUpperCase(), tasks: [] };
    });

    // TODO and WIP are open by default; BLOCKED and DONE are collapsed
    const defaultOpen = new Set(["todo", "wip"]);

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
    }
    .header h2 {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .header .count {
      font-size: 11px;
      opacity: 0.6;
    }
    .btn-refresh {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      opacity: 0.6;
      font-size: 14px;
    }
    .btn-refresh:hover { opacity: 1; }

    /* Accordion sections */
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
    .section-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .section-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .section[data-status="todo"] .section-dot  { background: var(--vscode-charts-blue); }
    .section[data-status="wip"] .section-dot   { background: var(--vscode-charts-yellow); }
    .section[data-status="done"] .section-dot  { background: var(--vscode-charts-green); }
    .section[data-status="blocked"] .section-dot { background: var(--vscode-charts-red); }

    .section-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 10px;
      font-weight: 600;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 1px 7px;
      border-radius: 10px;
    }
    .chevron {
      font-size: 11px;
      opacity: 0.6;
      transition: transform 0.2s ease;
      display: inline-block;
    }
    .section.open .chevron {
      transform: rotate(90deg);
    }

    /* Body of accordion */
    .section-body {
      display: none;
      padding: 8px;
      background: var(--vscode-sideBar-background);
      animation: fadeIn 0.15s ease-in-out;
    }
    .section.open .section-body {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-2px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Cards */
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

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .card-id {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.6;
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-editorWidget-background);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .card-goal {
      font-size: 12px;
      line-height: 1.4;
      font-weight: 500;
      margin-top: 2px;
    }
    .card-progress {
      font-size: 10px;
      opacity: 0.7;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .progress-bar {
      flex: 1;
      height: 4px;
      background: var(--vscode-panel-border);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--vscode-charts-green);
      border-radius: 2px;
      transition: width 0.3s;
    }
    .card-actions {
      display: flex;
      gap: 4px;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px dashed var(--vscode-panel-border);
    }
    .move-btn {
      flex: 1;
      font-size: 10px;
      padding: 4px 0;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      text-transform: uppercase;
      font-weight: 600;
      transition: all 0.1s;
    }
    .move-btn:hover {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }
    .empty {
      font-size: 12px;
      opacity: 0.5;
      font-style: italic;
      text-align: center;
      padding: 20px 0;
      border-radius: 4px;
      border: 1px dashed var(--vscode-panel-border);
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Agent Kanban</h2>
    <span class="count">${board.totalTasks} tasks</span>
    <button class="btn-refresh" onclick="refresh()" title="Refresh">↻</button>
  </div>

  ${columns.map(col => {
    const isOpenByDefault = defaultOpen.has(col.status);
    const cards = col.tasks.length === 0
      ? '<div class="empty">No tasks</div>'
      : col.tasks.map(task => {
          const total = task.acceptance.length;
          const checked = task.acceptance.filter(a => a.checked).length;
          const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
          const statuses = ["todo", "wip", "done", "blocked"].filter(s => s !== task.status);
          return `
          <div class="card" data-status="${task.status}" onclick="openFile('${task.filename}')">
            <div class="card-header">
              <div class="card-id">#${task.id}</div>
            </div>
            <div class="card-goal">${escapeHtml(task.goal || task.slug.replace(/-/g, " "))}</div>
            ${
              total > 0
                ? `<div class="card-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                    <span>${checked}/${total}</span>
                  </div>`
                : ""
            }
            <div class="card-actions" onclick="event.stopPropagation()">
              ${statuses.map(s => `<button class="move-btn" onclick="moveTask('${task.id}','${s}')">${s}</button>`).join("")}
              ${task.status === 'done' ? `<button class="move-btn" style="background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-color:var(--vscode-button-background)" onclick="compoundLearnings('${task.id}')">⚡ Compound</button>` : ""}
            </div>
          </div>`;
        }).join("");

    return `
    <div class="section ${isOpenByDefault ? 'open' : ''}" id="section-${col.status}" data-status="${col.status}">
      <div class="section-header" onclick="toggleSection('${col.status}')">
        <div class="section-title">
          <span class="section-dot"></span>
          <span>${col.label}</span>
        </div>
        <div class="section-meta">
          <span class="badge">${col.tasks.length}</span>
          <span class="chevron">›</span>
        </div>
      </div>
      <div class="section-body">
        ${cards}
      </div>
    </div>`;
  }).join("")}

  <div class="section" id="section-workflow-tools" data-status="workflow">
    <div class="section-header" onclick="toggleSection('workflow-tools')">
      <div class="section-title">
        <span class="section-dot" style="background: #3498db"></span>
        <span>Workflow Tools</span>
      </div>
      <div class="section-meta">
        <span class="chevron">›</span>
      </div>
    </div>
    <div class="section-body">
      <div style="display:flex; flex-direction:column; gap:6px">
        <button class="move-btn" style="padding:6px 0; font-size:11px" onclick="planFeature()">
          📝 Plan Next Feature (PRD)
        </button>
        <div style="display:flex; gap:4px">
          <button class="move-btn" style="flex:1; font-size:10px" onclick="requestReview('security')">
            🔒 Security Review
          </button>
          <button class="move-btn" style="flex:1; font-size:10px" onclick="requestReview('performance')">
            ⚡ Performance Review
          </button>
        </div>
        <button class="move-btn" style="padding:5px 0; font-size:10px; opacity:0.7" onclick="openMemoryConfig()">
          🗄️ Memory Backend Config
        </button>
      </div>
    </div>
  </div>

  <div class="section" id="section-memory-monitor" data-status="monitor">
    <div class="section-header" onclick="toggleSection('memory-monitor')">
      <div class="section-title">
        <span class="section-dot" style="background: #9b59b6"></span>
        <span>Memory Monitor</span>
      </div>
      <div class="section-meta">
        <span class="badge" id="monitor-badge">0</span>
        <span class="chevron">›</span>
      </div>
    </div>
    <div class="section-body">
      <div id="monitor-empty" class="empty">No memory accesses this session</div>
      <table id="monitor-table" style="display:none; width:100%; border-collapse:collapse; font-size:11px">
        <thead>
          <tr style="opacity:0.6; text-align:left">
            <th style="padding:4px 2px">File</th>
            <th style="padding:4px 2px">Tier</th>
            <th style="padding:4px 2px; text-align:right">Used</th>
            <th style="padding:4px 2px; text-align:right">Saved</th>
          </tr>
        </thead>
        <tbody id="monitor-rows"></tbody>
        <tfoot>
          <tr style="font-weight:600; border-top: 1px solid var(--vscode-panel-border)">
            <td style="padding:4px 2px" colspan="2">Total</td>
            <td id="monitor-total-used" style="padding:4px 2px; text-align:right">0 tk</td>
            <td id="monitor-total-saved" style="padding:4px 2px; text-align:right; color: var(--vscode-charts-green)">0 tk</td>
          </tr>
        </tfoot>
      </table>
      <button class="move-btn" style="margin-top:8px; width:100%" onclick="clearSession()">⊘ Clear Session</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // State: map of status → open (true/false)
    // Default: todo and wip open
    const DEFAULT_OPEN = new Set(['todo', 'wip']);
    const savedState = vscode.getState() || {};
    const collapseState = savedState.collapseState || {};

    // On load, apply saved collapse state (overrides HTML defaults)
    document.querySelectorAll('.section').forEach(sec => {
      const status = sec.dataset.status;
      if (status in collapseState) {
        if (collapseState[status]) {
          sec.classList.add('open');
        } else {
          sec.classList.remove('open');
        }
      }
    });

    function toggleSection(status) {
      const sec = document.getElementById('section-' + status);
      const isOpen = sec.classList.toggle('open');
      // Persist
      const state = vscode.getState() || {};
      const cs = state.collapseState || {};
      cs[status] = isOpen;
      vscode.setState({ ...state, collapseState: cs });
    }

    function refresh() {
      vscode.postMessage({ type: 'refresh' });
    }
    function openFile(filename) {
      vscode.postMessage({ type: 'openFile', filename });
    }
    function moveTask(taskId, newStatus) {
      vscode.postMessage({ type: 'moveTask', taskId, newStatus });
    }
    function clearSession() {
      vscode.postMessage({ type: 'clearSession' });
    }
    function planFeature() {
      vscode.postMessage({ type: 'planFeature' });
    }
    function requestReview(reviewType) {
      vscode.postMessage({ type: 'requestReview', reviewType });
    }
    function compoundLearnings(taskId) {
      vscode.postMessage({ type: 'compoundLearnings', taskId });
    }
    function openMemoryConfig() {
      vscode.postMessage({ type: 'openMemoryConfig' });
    }

    // ── Memory Monitor ──────────────────────────────────────────
    window.addEventListener('message', function(event) {
      const msg = event.data;
      if (msg.type !== 'sessionSnapshot') return;
      const entries = msg.entries || [];
      const summary = msg.summary || {};
      const badge = document.getElementById('monitor-badge');
      const empty = document.getElementById('monitor-empty');
      const table = document.getElementById('monitor-table');
      const rows  = document.getElementById('monitor-rows');
      const totalUsed  = document.getElementById('monitor-total-used');
      const totalSaved = document.getElementById('monitor-total-saved');

      badge.textContent = entries.length;
      if (entries.length === 0) {
        empty.style.display = '';
        table.style.display = 'none';
        return;
      }
      empty.style.display = 'none';
      table.style.display = '';

      rows.innerHTML = entries.map(function(e) {
        const name = e.filePath.split(/[\\\\/]/).pop();
        const saved = e.fullTokenCount - e.tokensUsed;
        const tierColor = e.tierLoaded === 'L2'
          ? 'var(--vscode-charts-red)'
          : e.tierLoaded === 'L1'
          ? 'var(--vscode-charts-yellow)'
          : 'var(--vscode-charts-green)';
        return '<tr>'
          + '<td style="padding:3px 2px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + e.filePath + '">' + name + '</td>'
          + '<td style="padding:3px 2px;color:' + tierColor + ';font-weight:600">' + e.tierLoaded + '</td>'
          + '<td style="padding:3px 2px;text-align:right">' + e.tokensUsed + ' tk</td>'
          + '<td style="padding:3px 2px;text-align:right;color:var(--vscode-charts-green)">' + (saved > 0 ? '+' + saved : saved) + ' tk</td>'
          + '</tr>';
      }).join('');

      totalUsed.textContent  = (summary.totalTokensUsed || 0) + ' tk';
      totalSaved.textContent = '+' + (summary.totalTokensSaved || 0) + ' tk';
    });
  </script>
</body>
</html>`;
  }

  private _getErrorHtml(): string {
    return /*html*/ `<!DOCTYPE html>
<html><body style="font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground);">
  <p>Could not load board.</p>
  <p style="opacity: 0.6; font-size: 12px;">Make sure <code>docs/tasks/</code> exists in your workspace.</p>
</body></html>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
