import * as vscode from "vscode";
import { scanBoard, moveTask } from "@agent-kanban/core";
import type { TaskStatus } from "@agent-kanban/core";
import { getHtml, getErrorHtml } from "./webview/index.js";

/** Provides the unified Kanban board webview in the sidebar (Tabs: Kanban, Monitor, Settings). */
export class BoardViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  /** Session memory access snapshot — updated by clearSession or external push. */
  private _sessionSnapshot: Array<{ filePath: string; tierLoaded: string; tokensUsed: number; fullTokenCount: number; loadedAt: string }> = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly workspaceRoot: string,
  ) { }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.onDidReceiveMessage(msg => this._handleMessage(msg));
    await this._updateWebview();
  }

  /** Refresh the board data. */
  async refresh() {
    await this._updateWebview();
  }

  // ── Private ────────────────────────────────────────────────────

  private async _handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      // ── Kanban ────────────────────────────────────────────────
      case "moveTask": {
        try {
          await moveTask(this.workspaceRoot, msg.taskId as string, msg.newStatus as TaskStatus);
          this.refresh();
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to move task: ${err.message}`);
        }
        break;
      }
      case "openFile": {
        const uri = vscode.Uri.file(`${this.workspaceRoot}/docs/tasks/${msg.filename}`);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        break;
      }
      case "refresh": {
        this.refresh();
        break;
      }
      case "planFeature": {
        vscode.commands.executeCommand("agentKanban.createPrd");
        break;
      }
      case "requestReview": {
        const reviewType = (msg.reviewType as string) ?? "security";
        const label = reviewType === "performance" ? "Performance" : "Security";
        const uri = `kanban://review/${reviewType}`;
        const md = [
          `# ${label} Review Request`, "",
          `> Fetched from MCP resource: \`${uri}\``, "",
          "Run the following in your AI agent to start the review:", "",
          "```",
          `Read the resource ${uri} and review the current staged changes against the checklist.`,
          "```",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      case "compoundLearnings": {
        const taskId = msg.taskId as string | undefined;
        if (!taskId) break;
        const md = [
          `# Compound Learnings — Task ${taskId}`, "",
          "Run the following in your AI agent to extract and persist memories:", "",
          "```",
          `Call the MCP tool compound_learnings with task_id: "${taskId}" to extract reusable learnings, then call memory_overview to review the results.`,
          "```",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      // ── Monitor ───────────────────────────────────────────────
      case "clearSession": {
        this._sessionSnapshot = [];
        this._view?.webview.postMessage({
          type: "sessionSnapshot",
          entries: [],
          summary: { filesAccessed: 0, totalTokensUsed: 0, totalFullTokens: 0, totalTokensSaved: 0 },
        });
        break;
      }
      // ── Settings ──────────────────────────────────────────────
      case "setupMcpServer": {
        await vscode.commands.executeCommand("agentKanban.setupMcpServer");
        break;
      }
      case "reloadWindow": {
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
        break;
      }
      case "openDocs": {
        const readmePath = `${this.workspaceRoot}/README.md`;
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(readmePath));
          await vscode.window.showTextDocument(doc);
        } catch {
          vscode.env.openExternal(vscode.Uri.parse("https://github.com/next-dev-team/vide-coding-agent-starter"));
        }
        break;
      }
      case "setMemoryBackend": {
        vscode.window.showInformationMessage(
          `Memory backend: ask your agent to call memory_config_set with backend="${msg.backend}"`,
        );
        break;
      }
    }
  }

  private async _updateWebview() {
    if (!this._view) return;
    try {
      const board = await scanBoard(this.workspaceRoot);
      this._view.webview.html = getHtml(board);
    } catch {
      this._view.webview.html = getErrorHtml();
    }
  }
}
