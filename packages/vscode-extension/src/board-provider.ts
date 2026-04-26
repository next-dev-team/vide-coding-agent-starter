import * as vscode from "vscode";
import { scanBoard, moveTask } from "@agent-kanban/core";
import type { Board } from "@agent-kanban/core";

/** Provides the Kanban board webview in the sidebar. */
export class BoardViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

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
      padding: 8px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h2 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
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

    .column {
      margin-bottom: 16px;
    }
    .column-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      opacity: 0.7;
    }
    .column-header .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 8px;
      font-weight: 600;
    }
    .column-header.todo { color: var(--vscode-charts-blue); }
    .column-header.wip { color: var(--vscode-charts-yellow); }
    .column-header.done { color: var(--vscode-charts-green); }
    .column-header.blocked { color: var(--vscode-charts-red); }

    .drop-zone {
      min-height: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .drop-zone.drag-over {
      min-height: 32px;
      background: var(--vscode-list-hoverBackground);
      border: 1px dashed var(--vscode-focusBorder);
    }

    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 4px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .card:hover {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-hoverBackground);
    }
    .card.dragging {
      opacity: 0.4;
    }
    .card-id {
      font-size: 10px;
      font-weight: 600;
      opacity: 0.5;
      font-family: var(--vscode-editor-font-family);
    }
    .card-goal {
      font-size: 12px;
      line-height: 1.4;
    }
    .card-progress {
      font-size: 10px;
      opacity: 0.5;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .progress-bar {
      flex: 1;
      height: 3px;
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

    .move-btns {
      display: none;
      gap: 2px;
      margin-top: 4px;
    }
    .card:hover .move-btns { display: flex; }
    .move-btn {
      font-size: 10px;
      padding: 2px 6px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
    }
    .move-btn:hover {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .empty {
      font-size: 11px;
      opacity: 0.4;
      font-style: italic;
      padding: 4px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Kanban Board</h2>
    <span class="count">${board.totalTasks} tasks</span>
    <button class="btn-refresh" onclick="refresh()" title="Refresh">↻</button>
  </div>

  ${board.columns
    .filter((col) => col.tasks.length > 0 || col.status === "todo" || col.status === "wip")
    .map(
      (col) => `
    <div class="column" data-status="${col.status}">
      <div class="column-header ${col.status}">
        <span>${col.status === "wip" ? "⚡" : col.status === "todo" ? "📋" : col.status === "done" ? "✅" : "🚫"} ${col.label}</span>
        <span class="badge">${col.tasks.length}</span>
      </div>
      <div class="drop-zone"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event, '${col.status}')">
      </div>
      ${
        col.tasks.length === 0
          ? '<div class="empty">No tasks</div>'
          : col.tasks
              .map((task) => {
                const total = task.acceptance.length;
                const checked = task.acceptance.filter((a) => a.checked).length;
                const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
                const statuses = ["todo", "wip", "done", "blocked"].filter(s => s !== task.status);
                return `
        <div class="card"
          draggable="true"
          ondragstart="handleDragStart(event, '${task.id}')"
          ondragend="handleDragEnd(event)"
          onclick="openFile('${task.filename}')">
          <div class="card-id">#${task.id}</div>
          <div class="card-goal">${escapeHtml(task.goal || task.slug.replace(/-/g, " "))}</div>
          ${
            total > 0
              ? `<div class="card-progress">
                  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                  <span>${checked}/${total}</span>
                </div>`
              : ""
          }
          <div class="move-btns">
            ${statuses.map(s => `<button class="move-btn" onclick="event.stopPropagation();moveTask('${task.id}','${s}')">${s}</button>`).join("")}
          </div>
        </div>`;
              })
              .join("")
      }
    </div>`,
    )
    .join("")}

  <script>
    const vscode = acquireVsCodeApi();

    function refresh() {
      vscode.postMessage({ type: "refresh" });
    }
    function openFile(filename) {
      vscode.postMessage({ type: "openFile", filename });
    }
    function moveTask(taskId, newStatus) {
      vscode.postMessage({ type: "moveTask", taskId, newStatus });
    }

    let draggedTaskId = null;
    function handleDragStart(e, taskId) {
      draggedTaskId = taskId;
      e.target.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    }
    function handleDragEnd(e) {
      e.target.classList.remove("dragging");
      document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("drag-over"));
    }
    function handleDragOver(e) {
      e.preventDefault();
      e.currentTarget.classList.add("drag-over");
    }
    function handleDragLeave(e) {
      e.currentTarget.classList.remove("drag-over");
    }
    function handleDrop(e, newStatus) {
      e.preventDefault();
      e.currentTarget.classList.remove("drag-over");
      if (draggedTaskId) {
        moveTask(draggedTaskId, newStatus);
        draggedTaskId = null;
      }
    }
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
