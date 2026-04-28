import * as vscode from "vscode";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  scanBoard,
  moveTask,
  resolveTaskDir,
  type Board,
  type TaskStatus,
} from "@agent-kanban/core";
import { renderSvelteHtml, svelteResourceRoots } from "./svelte-host.js";

/**
 * Wide editor-area Kanban board, rendered by the Svelte webview-ui.
 * One panel per workspace; reused on subsequent invocations.
 */
export class BoardPanel {
  private static current: BoardPanel | undefined;

  static async createOrShow(
    extensionPath: string,
    workspaceRoot: string,
  ): Promise<BoardPanel> {
    if (BoardPanel.current) {
      BoardPanel.current.workspaceRoot = workspaceRoot;
      BoardPanel.current.panel.reveal(vscode.ViewColumn.Active);
      await BoardPanel.current.refresh();
      return BoardPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      "agentKanban.boardPanel",
      "Agent Kanban — Board",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: svelteResourceRoots(extensionPath),
      },
    );

    BoardPanel.current = new BoardPanel(panel, extensionPath, workspaceRoot);
    await BoardPanel.current.init();
    return BoardPanel.current;
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionPath: string,
    private workspaceRoot: string,
  ) {
    panel.onDidDispose(() => {
      if (BoardPanel.current === this) BoardPanel.current = undefined;
    });
  }

  setWorkspaceRoot(path: string) {
    this.workspaceRoot = path;
    void this.refresh();
  }

  async refresh() {
    const board = await scanBoard(this.workspaceRoot);
    void this.panel.webview.postMessage({ type: "boardUpdated", board } satisfies HostMsg);
  }

  private async init() {
    this.panel.webview.html = await renderSvelteHtml({
      entry: "board.html",
      webview: this.panel.webview,
      extensionPath: this.extensionPath,
      title: "Agent Kanban — Board",
    });
    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    await this.refresh();
  }

  private async handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case "refresh":
        await this.refresh();
        break;
      case "moveTask": {
        try {
          await moveTask(
            this.workspaceRoot,
            msg.taskId as string,
            msg.newStatus as TaskStatus,
          );
          await this.refresh();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to move task: ${message}`);
          await this.refresh(); // resend so the optimistic UI corrects itself
        }
        break;
      }
      case "openFile": {
        const filename = msg.filename as string;
        const isDone = filename.startsWith("done-");
        const dir = isDone
          ? resolveTaskDir(this.workspaceRoot, "done")
          : resolveTaskDir(this.workspaceRoot, "todo");
        const file = join(dir, filename);
        if (!existsSync(file)) {
          vscode.window.showWarningMessage(`Task file not found: ${filename}`);
          return;
        }
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
        break;
      }
      case "createTask":
        await vscode.commands.executeCommand("agentKanban.createTask");
        break;
    }
  }
}

type HostMsg = { type: "boardUpdated"; board: Board };
