import * as vscode from "vscode";
import { scanBoard } from "@agent-kanban/core";

/** Manages the status bar item showing task counts. */
export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor(private readonly workspaceRoot: string) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.item.command = "agentKanban.openBoard";
    this.item.tooltip = "Open Kanban Board";
    this.item.show();
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
      this.item.text = `$(checklist) ${counts}`;
    } catch {
      this.item.text = "$(checklist) Kanban";
    }
  }

  dispose() {
    this.item.dispose();
  }
}
