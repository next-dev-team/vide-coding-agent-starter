import * as vscode from "vscode";
import { scanBoard } from "@agent-kanban/core";

/** Manages the status bar item showing task counts. */
export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private _projectName = "";
  private _showName = false;

  constructor(private workspaceRoot: string) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.item.command = "agentKanban.openBoard";
    this.item.tooltip = "Open Kanban Board";
    this.item.show();
  }

  /** Switch the active project (call update() after to refresh display). */
  setProject(path: string, name: string, showName: boolean) {
    this.workspaceRoot = path;
    this._projectName = name;
    this._showName = showName;
    this.item.tooltip = showName
      ? `Agent Kanban: ${name} — Click to open board`
      : "Open Kanban Board";
  }

  /** Update the status bar with current task counts. */
  async update() {
    try {
      const board = await scanBoard(this.workspaceRoot);
      const counts = board.columns
        .filter((c) => c.status !== "done")
        .map((c) => {
          const icon =
            c.status === "todo" ? "📋" :
            c.status === "wip" ? "⚡" :
            c.status === "blocked" ? "🚫" : "";
          return `${icon}${c.tasks.length}`;
        })
        .join(" ");
      const prefix = this._showName ? `${this._projectName} ` : "";
      this.item.text = `$(checklist) ${prefix}${counts}`;
    } catch {
      this.item.text = "$(checklist) Kanban";
    }
  }

  dispose() {
    this.item.dispose();
  }
}
