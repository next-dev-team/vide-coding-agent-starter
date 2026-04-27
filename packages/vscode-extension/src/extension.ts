import * as vscode from "vscode";
import { BoardViewProvider } from "./board-provider.js";
import { StatusBarManager } from "./status-bar.js";
import { scanBoard, nextId, writeTask, taskFilename, writePrd, prdFilename } from "@agent-kanban/core";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

/** Extension entry point. */
export async function activate(context: vscode.ExtensionContext) {
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
    vscode.commands.registerCommand("agentKanban.setupMcpServer", async (target?: string) => {
      await setupMcpServer(workspaceRoot, context, target || "vscode");
    }),
  );

  // ─── First-run: prompt MCP setup if .vscode/mcp.json missing ──
  const mcpJsonPath = join(workspaceRoot, ".vscode", "mcp.json");
  if (!existsSync(mcpJsonPath)) {
    const choice = await vscode.window.showInformationMessage(
      "Agent Kanban: No MCP server config found. Set it up now so AI agents (Copilot, etc.) can manage your Kanban board?",
      "Set Up MCP",
      "Not Now",
    );
    if (choice === "Set Up MCP") {
      await setupMcpServer(workspaceRoot, context, "vscode");
    }
  }
}

/**
 * Writes or merges MCP server config for the given target client.
 *
 * Supported targets:
 * - `vscode`      → `.vscode/mcp.json`       (key: `servers`, includes `type: "stdio"`)
 * - `antigravity` → `~/.gemini/antigravity/mcp_config.json` (key: `mcpServers`)
 * - `cursor`      → `.cursor/mcp.json`       (key: `mcpServers`)
 */
async function setupMcpServer(
  workspaceRoot: string,
  context: vscode.ExtensionContext,
  target: string,
): Promise<void> {
  // Resolve the MCP server dist path — works both in dev and installed builds.
  const serverPath = resolve(
    context.extensionPath,
    "..",
    "mcp-server",
    "dist",
    "index.js",
  );

  let configDirPath: string;
  let mcpJsonPath: string;
  let serversKey: string;
  let entryValue: Record<string, unknown>;
  let targetLabel: string;

  switch (target) {
    case "antigravity": {
      // Antigravity uses a global config at ~/.gemini/antigravity/mcp_config.json
      const homeDir = process.env.USERPROFILE || process.env.HOME || "";
      configDirPath = join(homeDir, ".gemini", "antigravity");
      mcpJsonPath = join(configDirPath, "mcp_config.json");
      serversKey = "mcpServers";
      entryValue = {
        command: "node",
        args: [serverPath],
        disabled: false,
      };
      targetLabel = "Antigravity (~/.gemini/antigravity/mcp_config.json)";
      break;
    }
    case "cursor": {
      configDirPath = join(workspaceRoot, ".cursor");
      mcpJsonPath = join(configDirPath, "mcp.json");
      serversKey = "mcpServers";
      entryValue = {
        command: "node",
        args: [serverPath],
      };
      targetLabel = "Cursor (.cursor/mcp.json)";
      break;
    }
    default: {
      // VS Code / Copilot
      configDirPath = join(workspaceRoot, ".vscode");
      mcpJsonPath = join(configDirPath, "mcp.json");
      serversKey = "servers";
      entryValue = {
        type: "stdio",
        command: "node",
        args: [serverPath],
      };
      targetLabel = "VS Code (.vscode/mcp.json)";
      break;
    }
  }

  // Read existing config or start fresh.
  let config: Record<string, unknown> = {};
  if (existsSync(mcpJsonPath)) {
    try {
      const raw = await readFile(mcpJsonPath, "utf-8");
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Ignore parse errors — we'll overwrite the kanban entry only.
    }
  }

  // Merge in the kanban server entry without touching other servers.
  const servers = (config[serversKey] ?? {}) as Record<string, unknown>;
  servers["agent-kanban"] = entryValue;
  config[serversKey] = servers;

  await mkdir(configDirPath, { recursive: true });
  await writeFile(mcpJsonPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

  const openAction = "Open Config";
  const choice = await vscode.window.showInformationMessage(
    `✅ MCP server configured for ${targetLabel}. Reload the window to activate.`,
    openAction,
  );
  if (choice === openAction) {
    const doc = await vscode.workspace.openTextDocument(mcpJsonPath);
    await vscode.window.showTextDocument(doc);
  }
}

export function deactivate() {}
