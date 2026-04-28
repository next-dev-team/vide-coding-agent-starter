import * as vscode from "vscode";
import { BoardViewProvider } from "./board-provider.js";
import { BoardPanel } from "./board-panel.js";
import { DocsPanel } from "./docs-panel.js";
import { StatusBarManager } from "./status-bar.js";
import { scanBoard, nextId, writeTask, taskFilename, writePrd, prdFilename } from "@agent-kanban/core";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => { clearTimeout(timer); timer = setTimeout(fn, ms); };
}

/** Extension entry point. */
export async function activate(context: vscode.ExtensionContext) {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return;

  // ─── Resolve active project ────────────────────────────────
  const multiRoot = folders.length > 1;
  let activeRoot: string;

  if (!multiRoot) {
    activeRoot = folders[0].uri.fsPath;
  } else {
    const stored = context.workspaceState.get<string>("agentKanban.activeProjectRoot");
    if (stored && folders.some(f => f.uri.fsPath === stored)) {
      activeRoot = stored;
    } else {
      // Prompt user to pick when no valid stored preference exists
      const picked = await vscode.window.showQuickPick(
        folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })),
        { placeHolder: "Agent Kanban: Select project to manage" },
      );
      activeRoot = picked ? picked.folder.uri.fsPath : folders[0].uri.fsPath;
      await context.workspaceState.update("agentKanban.activeProjectRoot", activeRoot);
    }
  }

  // ─── Kanban Board Webview ──────────────────────────────────
  const pkgVersion = (context.extension.packageJSON as { version?: string }).version ?? "";
  const boardProvider = new BoardViewProvider(context.extensionUri, activeRoot, pkgVersion);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("agentKanban.boardView", boardProvider),
  );

  // ─── Status Bar ────────────────────────────────────────────
  const statusBar = new StatusBarManager(activeRoot);
  if (multiRoot) {
    const activeFolder = folders.find(f => f.uri.fsPath === activeRoot) ?? folders[0];
    statusBar.setProject(activeRoot, activeFolder.name, true);
  }
  context.subscriptions.push(statusBar);
  statusBar.update();

  // ─── File Watchers (re-created on project switch) ──────────
  let projectWatchers: vscode.Disposable[] = [];

  function registerWatchers(root: string) {
    for (const w of projectWatchers) w.dispose();
    projectWatchers = [];

    const refresh = debounce(() => {
      void boardProvider.refresh();
      void statusBar.update();
      // Notify wide panels if open. Static `current` returns undefined when not.
      void BoardPanel["current"]?.refresh();
      void DocsPanel["current"]?.refresh();
    }, 300);

    const w1 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, "docs/tasks/*.md"),
    );
    w1.onDidChange(refresh); w1.onDidCreate(refresh); w1.onDidDelete(refresh);
    projectWatchers.push(w1);

    const w2 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, "docs/tasks/done/*.md"),
    );
    w2.onDidChange(refresh); w2.onDidCreate(refresh); w2.onDidDelete(refresh);
    projectWatchers.push(w2);

    const w3 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, ".agents/skills/**/*.md"),
    );
    w3.onDidChange(() => { void boardProvider.refresh(); });
    w3.onDidCreate(() => { void boardProvider.refresh(); });
    w3.onDidDelete(() => { void boardProvider.refresh(); });
    projectWatchers.push(w3);

    const w4 = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, "docs/{prd,decisions,test-cases}/*.md"),
    );
    w4.onDidChange(refresh); w4.onDidCreate(refresh); w4.onDidDelete(refresh);
    projectWatchers.push(w4);
  }

  registerWatchers(activeRoot);
  context.subscriptions.push({ dispose: () => { for (const w of projectWatchers) w.dispose(); } });

  // ─── Project switch helper ─────────────────────────────────
  async function switchProject(newRoot: string, name: string) {
    activeRoot = newRoot;
    await context.workspaceState.update("agentKanban.activeProjectRoot", newRoot);
    boardProvider.setWorkspaceRoot(newRoot);
    BoardPanel["current"]?.setWorkspaceRoot(newRoot);
    DocsPanel["current"]?.setWorkspaceRoot(newRoot);
    statusBar.setProject(newRoot, name, true);
    void statusBar.update();
    registerWatchers(newRoot);
  }

  // ─── Commands ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("agentKanban.openBoard", () => {
      vscode.commands.executeCommand("agentKanban.boardView.focus");
    }),

    vscode.commands.registerCommand("agentKanban.refreshBoard", () => {
      void boardProvider.refresh();
      void statusBar.update();
    }),

    vscode.commands.registerCommand("agentKanban.selectProject", async () => {
      const current = vscode.workspace.workspaceFolders;
      if (!current || current.length <= 1) {
        vscode.window.showInformationMessage("Only one workspace folder is open.");
        return;
      }
      const picked = await vscode.window.showQuickPick(
        current.map(f => ({
          label: f.name,
          description: f.uri.fsPath,
          detail: f.uri.fsPath === activeRoot ? "$(check) Active" : "",
          folder: f,
        })),
        { placeHolder: "Select project for Agent Kanban" },
      );
      if (!picked || picked.folder.uri.fsPath === activeRoot) return;
      await switchProject(picked.folder.uri.fsPath, picked.folder.name);
      vscode.window.showInformationMessage(`Agent Kanban: Switched to "${picked.folder.name}"`);
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

      const id = await nextId(activeRoot, "task");
      const content = writeTask({ id, title: slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()), goal });
      const fname = taskFilename(id, slug);
      const filePath = join(activeRoot, "docs", "tasks", fname);
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

      const id = await nextId(activeRoot, "prd");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const content = writePrd({ id, title, problem });
      const fname = prdFilename(id, slug);
      const filePath = join(activeRoot, "docs", "prd", fname);
      await writeFile(filePath, content, "utf-8");

      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(`Created PRD: ${fname}`);
    }),

    vscode.commands.registerCommand("agentKanban.setupMcpServer", async (target?: string) => {
      await setupMcpServer(activeRoot, context, target || "vscode");
    }),

    vscode.commands.registerCommand("agentKanban.setupCompanion", async (server?: string) => {
      await setupCompanionServer(activeRoot, server || "context7");
    }),

    vscode.commands.registerCommand("agentKanban.openWideBoard", async () => {
      try {
        await BoardPanel.createOrShow(context.extensionPath, activeRoot);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Wide board failed to load: ${message}`);
      }
    }),

    vscode.commands.registerCommand("agentKanban.openDocsPanel", async () => {
      try {
        await DocsPanel.createOrShow(context.extensionPath, activeRoot);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Docs panel failed to load: ${message}`);
      }
    }),

    vscode.commands.registerCommand("agentKanban.openWebview", async (url?: string) => {
      let targetUrl = url;
      if (!targetUrl) {
        targetUrl = await vscode.window.showInputBox({
          prompt: "Enter URL to open in Webview",
          placeHolder: "https://docs.flutter.dev",
        });
      }
      if (!targetUrl) return;

      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }

      const panel = vscode.window.createWebviewPanel(
        "agentKanbanDocViewer",
        "Doc Viewer",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html { margin: 0; padding: 0; height: 100vh; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; background: white; }
          </style>
        </head>
        <body>
          <iframe src="${targetUrl}" allow="clipboard-read; clipboard-write"></iframe>
        </body>
        </html>
      `;
    }),
  );

  // ─── Handle workspace folder additions/removals ────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const updated = vscode.workspace.workspaceFolders;
      if (!updated || updated.length === 0) return;
      const stillValid = updated.some(f => f.uri.fsPath === activeRoot);
      if (!stillValid) {
        void switchProject(updated[0].uri.fsPath, updated[0].name);
        vscode.window.showInformationMessage(`Agent Kanban: Switched to "${updated[0].name}"`);
      }
    }),
  );

  // ─── First-run: prompt MCP setup if .vscode/mcp.json missing ──
  const mcpJsonPath = join(activeRoot, ".vscode", "mcp.json");
  if (!existsSync(mcpJsonPath)) {
    const choice = await vscode.window.showInformationMessage(
      "Agent Kanban: No MCP server config found. Set it up now so AI agents (Copilot, etc.) can manage your Kanban board?",
      "Set Up MCP",
      "Not Now",
    );
    if (choice === "Set Up MCP") {
      await setupMcpServer(activeRoot, context, "vscode");
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
  // Resolve the MCP server dist path.
  // 1. Check workspace root (monorepo: packages/mcp-server/dist/index.js)
  // 2. Fall back to extension-relative sibling (co-located installs)
  const monorepoCandidate = resolve(workspaceRoot, "packages", "mcp-server", "dist", "index.js");
  const extensionCandidate = resolve(context.extensionPath, "..", "mcp-server", "dist", "index.js");
  const serverPath = existsSync(monorepoCandidate) ? monorepoCandidate : extensionCandidate;

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

/** Companion MCP server definitions. */
const COMPANION_SERVERS: Record<string, {
  label: string;
  vscode: Record<string, unknown>;
  mcpServers: Record<string, unknown>;
}> = {
  context7: {
    label: "Context7",
    vscode: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
      env: { DEFAULT_MINIMUM_TOKENS: "10000" },
    },
    mcpServers: {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
      env: { DEFAULT_MINIMUM_TOKENS: "10000" },
      disabled: false,
    },
  },
  playwright: {
    label: "Playwright",
    vscode: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
    },
    mcpServers: {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest"],
      disabled: false,
    },
  },
};

/**
 * Writes a companion MCP server (Context7 or Playwright) into .vscode/mcp.json.
 * Also attempts to write it to the Antigravity global config and .cursor/mcp.json
 * if those files already exist (non-destructive merge).
 */
async function setupCompanionServer(
  workspaceRoot: string,
  server: string,
): Promise<void> {
  const def = COMPANION_SERVERS[server];
  if (!def) {
    vscode.window.showErrorMessage(`Unknown companion server: ${server}`);
    return;
  }

  const targets: Array<{
    path: string;
    key: string;
    entry: Record<string, unknown>;
    label: string;
  }> = [];

  // Always write to .vscode/mcp.json
  targets.push({
    path: join(workspaceRoot, ".vscode", "mcp.json"),
    key: "servers",
    entry: def.vscode,
    label: ".vscode/mcp.json",
  });

  // Also merge into .cursor/mcp.json if it exists
  const cursorPath = join(workspaceRoot, ".cursor", "mcp.json");
  if (existsSync(cursorPath)) {
    targets.push({
      path: cursorPath,
      key: "mcpServers",
      entry: def.mcpServers,
      label: ".cursor/mcp.json",
    });
  }

  // Also merge into Antigravity global config if it exists
  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const antigravityPath = join(homeDir, ".gemini", "antigravity", "mcp_config.json");
  if (existsSync(antigravityPath)) {
    targets.push({
      path: antigravityPath,
      key: "mcpServers",
      entry: def.mcpServers,
      label: "~/.gemini/antigravity/mcp_config.json",
    });
  }

  const written: string[] = [];
  for (const t of targets) {
    let config: Record<string, unknown> = {};
    try {
      const raw = await readFile(t.path, "utf-8");
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // start fresh
    }
    const servers = (config[t.key] ?? {}) as Record<string, unknown>;
    servers[server] = t.entry;
    config[t.key] = servers;

    await mkdir(join(t.path, ".."), { recursive: true });
    await writeFile(t.path, JSON.stringify(config, null, 2) + "\n", "utf-8");
    written.push(t.label);
  }

  const openAction = "Open Config";
  const choice = await vscode.window.showInformationMessage(
    `✅ ${def.label} added to: ${written.join(", ")}. Reload to activate.`,
    openAction,
  );
  if (choice === openAction) {
    const doc = await vscode.workspace.openTextDocument(targets[0].path);
    await vscode.window.showTextDocument(doc);
  }
}

export function deactivate() {}
