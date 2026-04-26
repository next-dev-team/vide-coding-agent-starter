import * as vscode from "vscode";
import { BoardViewProvider } from "./board-provider.js";
import { StatusBarManager } from "./status-bar.js";
import { scanBoard, nextId, writeTask, taskFilename, writePrd, prdFilename } from "@agent-kanban/core";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Extension entry point. */
export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  // ─── Kanban Board Webview ──────────────────────────────────
  const boardProvider = new BoardViewProvider(context.extensionUri, workspaceRoot);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agentKanban.boardView", boardProvider),
  );

  // ─── Status Bar ────────────────────────────────────────────
  const statusBar = new StatusBarManager(workspaceRoot);
  context.subscriptions.push(statusBar);
  statusBar.update();

  // ─── File Watcher ──────────────────────────────────────────
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceRoot, "docs/tasks/*.md"),
  );
  watcher.onDidChange(() => { boardProvider.refresh(); statusBar.update(); });
  watcher.onDidCreate(() => { boardProvider.refresh(); statusBar.update(); });
  watcher.onDidDelete(() => { boardProvider.refresh(); statusBar.update(); });
  context.subscriptions.push(watcher);

  // ─── Commands ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("agentKanban.openBoard", () => {
      vscode.commands.executeCommand("agentKanban.boardView.focus");
    }),

    vscode.commands.registerCommand("agentKanban.refreshBoard", () => {
      boardProvider.refresh();
      statusBar.update();
    }),

    vscode.commands.registerCommand("agentKanban.createTask", async () => {
      const goal = await vscode.window.showInputBox({
        prompt: "What does this task achieve? (one sentence)",
        placeHolder: "Add input field so users can create todos",
      });
      if (!goal) return;

      const slug = await vscode.window.showInputBox({
        prompt: "Kebab-case slug for the filename",
        placeHolder: "add-todo-input",
        value: goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40),
      });
      if (!slug) return;

      const id = await nextId(workspaceRoot, "task");
      const content = writeTask({ id, title: slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), goal });
      const fname = taskFilename(id, slug);
      const filePath = join(workspaceRoot, "docs", "tasks", fname);
      await writeFile(filePath, content, "utf-8");

      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(`Created task: ${fname}`);
    }),

    vscode.commands.registerCommand("agentKanban.createPrd", async () => {
      const title = await vscode.window.showInputBox({
        prompt: "Feature title",
        placeHolder: "Filter Todos",
      });
      if (!title) return;

      const problem = await vscode.window.showInputBox({
        prompt: "Problem statement (one paragraph)",
        placeHolder: "Users can't filter between active and completed todos...",
      });
      if (!problem) return;

      const id = await nextId(workspaceRoot, "prd");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const content = writePrd({ id, title, problem });
      const fname = prdFilename(id, slug);
      const filePath = join(workspaceRoot, "docs", "prd", fname);
      await writeFile(filePath, content, "utf-8");

      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(`Created PRD: ${fname}`);
    }),
  );
}

export function deactivate() {}
