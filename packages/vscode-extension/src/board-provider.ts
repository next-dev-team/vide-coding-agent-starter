import * as vscode from "vscode";
import { scanBoard, scanPrds, scanAdrs, scanTasks, moveTask, resolveTaskDir, createMemoryBackend, writeTask, nextId, taskFilename } from "@agent-kanban/core";
import type { TaskStatus, MemoryCategory, Board as CoreBoard } from "@agent-kanban/core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { rm, readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join, relative, basename, extname, dirname } from "node:path";
import { renderSvelteHtml, svelteResourceRoots } from "./svelte-host.js";

export interface WorkspaceEntry { name: string; path: string; }

/** Shape of a memory entry sent to the webview. */
export interface KnowledgeMemory {
  id: number;
  category: string;
  slug: string;
  abstract: string;
  tokenCount: number;
}

/** Knowledge data sent to the webview. */
export interface KnowledgeData {
  brainContent: string;
  brainExists: boolean;
  memories: KnowledgeMemory[];
  categories: Record<string, number>;
  totalMemories: number;
}
export interface SkillInfo {
  slug: string;
  name: string;
  description: string;
  format: "local" | "cursor" | "copilot" | "claude" | "vercel";
  path: string;
  active: boolean;
}

export interface I18nLocaleData {
  locale: string;
  filePath: string;
  keys: Record<string, string>;
}

export interface I18nCoverageEntry {
  locale: string;
  total: number;
  translated: number;
  percentage: number;
  missing: string[];
}

export interface I18nData {
  detected: boolean;
  localeDir: string;
  defaultLocale: string;
  locales: I18nLocaleData[];
  usedKeys: string[];
  coverage: I18nCoverageEntry[];
}

/** Provides the unified Kanban board webview in the sidebar (Tabs: Kanban, Monitor, Settings). */
export class BoardViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private readonly _version: string;
  /** Session memory access snapshot — updated by clearSession or external push. */
  private _sessionSnapshot: Array<{ filePath: string; tierLoaded: string; tokensUsed: number; fullTokenCount: number; loadedAt: string }> = [];

  /** Called when the webview requests a workspace switch. Wired up by extension.ts. */
  onSwitchWorkspaces?: (roots: WorkspaceEntry[]) => Promise<void>;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private workspaceRoots: WorkspaceEntry[],
    version = "",
  ) {
    this._version = version;
  }

  /** The primary (first) workspace root, used for single-root operations. */
  private get primaryRoot(): string {
    return this.workspaceRoots[0]?.path ?? "";
  }

  /** Replace all active workspace roots and refresh. */
  setWorkspaceRoots(roots: WorkspaceEntry[]) {
    this.workspaceRoots = roots;
    void this.refresh();
  }

  /** Compat shim for single-root callers (BoardPanel, DocsPanel). */
  setWorkspaceRoot(path: string) {
    const found = this.workspaceRoots.find(r => r.path === path);
    this.workspaceRoots = [found ?? { name: basename(path), path }];
    void this.refresh();
  }

  /** Cached skills list — refreshed on scan. */
  private _skills: SkillInfo[] = [];

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: svelteResourceRoots(this.extensionUri.fsPath),
    };
    webviewView.webview.onDidReceiveMessage(msg => this._handleMessage(msg));
    
    this._view.webview.html = await renderSvelteHtml({
      entry: "sidebar.html",
      webview: this._view.webview,
      extensionPath: this.extensionUri.fsPath,
      title: "Agent Kanban Sidebar",
    });

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
        const moveRoot = (msg.projectRoot as string) || this.primaryRoot;
        try {
          await moveTask(moveRoot, msg.taskId as string, msg.newStatus as TaskStatus);
          this.refresh();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to move task: ${message}`);
        }
        break;
      }
      case "openFile": {
        const filename = msg.filename as string;
        const openRoot = (msg.projectRoot as string) || this.primaryRoot;
        const isDone = filename.startsWith("done-");
        const dir = isDone
          ? resolveTaskDir(openRoot, "done")
          : resolveTaskDir(openRoot, "todo");
        const uri = vscode.Uri.file(join(dir, filename));
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        break;
      }
      case "refresh": {
        this.refresh();
        break;
      }
      case "tickAcceptance":
      case "untickAcceptance": {
        const taskId = msg.taskId as string;
        const idx = msg.index as number;
        if (!taskId || idx === undefined) break;
        const tickRoot = (msg.projectRoot as string) || this.primaryRoot;
        try {
          const tasks = await scanTasks(tickRoot);
          const task = tasks.find((t) => t.id === taskId);
          if (!task) break;
          const dir = task.status === "done"
            ? resolveTaskDir(tickRoot, "done")
            : resolveTaskDir(tickRoot, "todo");
          const filePath = join(dir, task.filename);
          let content = await readFile(filePath, "utf-8");
          const lines = content.split("\n");
          let checkboxCount = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^-\s+\[[ xX]\]/)) {
              if (checkboxCount === idx) {
                lines[i] = msg.type === "tickAcceptance"
                  ? lines[i].replace(/\[[ ]\]/, "[x]")
                  : lines[i].replace(/\[[xX]\]/, "[ ]");
                break;
              }
              checkboxCount++;
            }
          }
          content = lines.join("\n");
          await writeFile(filePath, content, "utf-8");
          this.refresh();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to update criterion: ${message}`);
        }
        break;
      }
      case "planFeature": {
        vscode.commands.executeCommand("agentKanban.createPrd");
        break;
      }
      case "createTask": {
        vscode.commands.executeCommand("agentKanban.createTask");
        break;
      }
      case "createTaskWithDetails": {
        const goal = msg.goal as string;
        const slug = msg.slug as string;
        if (!goal || !slug) break;
        try {
          const id = await nextId(this.primaryRoot, "task");
          const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const content = writeTask({ id, title, goal });
          const fname = taskFilename(id, slug);
          const filePath = join(this.primaryRoot, "docs", "tasks", fname);
          
          // Ensure directory exists
          const dirPath = join(this.primaryRoot, "docs", "tasks");
          if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
          }
          
          await writeFile(filePath, content, "utf-8");
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc);
          vscode.window.showInformationMessage(`Created task: ${fname}`);
          this.refresh();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to create task: ${message}`);
        }
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
      case "syncDocs": {
        const md = [
          `# 🔄 Sync Docs`, "",
          "Run the following in your AI agent to synchronize your documentation with the current codebase:", "",
          "```",
          `Call the MCP tool docs_sync with a target file (like docs/prd/0001-feature.md) to check for out-of-sync documentation and reconcile it.`,
          "```",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      case "syncAll": {
        const md = [
          `# 🔍 Sync All + Review`, "",
          "Run the following in your AI agent to perform a **full project audit**:", "",
          "```",
          `Call the MCP tool project_sync_all to scan PRDs, tasks, code drift, git status, docs freshness, and memory health. Review the findings and execute the recommended actions.`,
          "```", "",
          "**What it scans:**",
          "- 📋 PRD status vs task completion (are shipped features marked?)",
          "- ✅ Task acceptance criteria (all checked?)",
          "- 🔀 Code drift on WIP tasks (unexpected/missing files?)",
          "- 🌿 Git status (uncommitted changes, stale worktrees?)",
          "- 🧠 Memory health (brain freshness, dedup needed?)",
          "- 📄 Docs freshness (AGENTS.md, PROJECT_BRAIN.md stale?)",
          "- 🔒 Security + ⚡ Performance review status", "",
          "**Options:**",
          "- `include_review: false` — skip review checklists",
          "- `include_git: false` — skip git status analysis",
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
      // ── Knowledge ─────────────────────────────────────────────
      case "syncBrain": {
        const md = [
          `# 🧠 Sync Project Brain`, "",
          "Run the following in your AI agent to regenerate the PROJECT_BRAIN.md:", "",
          "```",
          `Call the MCP tool memory_brain_sync to regenerate docs/PROJECT_BRAIN.md from the memory engine's L0 abstracts.`,
          "```",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      case "openBrain": {
        const brainPath = join(this.primaryRoot, "docs", "PROJECT_BRAIN.md");
        if (existsSync(brainPath)) {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(brainPath));
          await vscode.window.showTextDocument(doc);
        } else {
          vscode.window.showInformationMessage("PROJECT_BRAIN.md not found. Sync it first via an agent.");
        }
        break;
      }
      case "readMemory": {
        const memId = msg.memoryId as string;
        if (!memId) break;
        const md2 = [
          `# 📖 Read Memory #${memId}`, "",
          "Run the following in your AI agent:", "",
          "```",
          `Call the MCP tool memory_read with id_or_path: "${memId}" to load the full L2 content.`,
          "```",
        ].join("\n");
        const doc2 = await vscode.workspace.openTextDocument({ content: md2, language: "markdown" });
        await vscode.window.showTextDocument(doc2, { preview: true });
        break;
      }
      case "findMemory": {
        const query = msg.query as string;
        if (!query) break;
        const md3 = [
          `# 🔍 Search Memories: "${query}"`, "",
          "Run the following in your AI agent:", "",
          "```",
          `Call the MCP tool memory_find with query: "${query}" to search project memories.`,
          "```",
        ].join("\n");
        const doc3 = await vscode.workspace.openTextDocument({ content: md3, language: "markdown" });
        await vscode.window.showTextDocument(doc3, { preview: true });
        break;
      }
      // ── Browser ──────────────────────────────────────────────
      case "openUrl": {
        const urlStr = msg.url as string;
        if (!urlStr) break;
        try {
          // Try VS Code's built-in Simple Browser first
          await vscode.commands.executeCommand("simpleBrowser.api.open", vscode.Uri.parse(urlStr));
        } catch {
          // Fallback: open in external browser
          await vscode.env.openExternal(vscode.Uri.parse(urlStr));
        }
        break;
      }
      // ── Workspace switch ─────────────────────────────────────
      case "setActiveWorkspaces": {
        const paths = msg.paths as string[];
        if (!paths?.length || !this.onSwitchWorkspaces) break;
        const allFolders = vscode.workspace.workspaceFolders ?? [];
        const newRoots = allFolders
          .filter(f => paths.includes(f.uri.fsPath))
          .map(f => ({ name: f.name, path: f.uri.fsPath }));
        if (newRoots.length > 0) {
          await this.onSwitchWorkspaces(newRoots);
        }
        break;
      }
      // ── Settings ──────────────────────────────────────────────
      case "setupMcpServer": {
        const target = (msg.target as string) || "vscode";
        await vscode.commands.executeCommand("agentKanban.setupMcpServer", target);
        break;
      }
      case "reloadWindow": {
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
        break;
      }
      case "openDocs": {
        const readmePath = `${this.primaryRoot}/README.md`;
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
      case "setupCompanion": {
        const server = msg.server as string;
        await vscode.commands.executeCommand("agentKanban.setupCompanion", server);
        break;
      }
      case "initAgentsMd": {
        const includeContext7 = msg.includeContext7 as boolean;
        const includePlaywright = msg.includePlaywright as boolean;
        await initAgentsMd(this.primaryRoot, includeContext7, includePlaywright);
        break;
      }
      // ── Git automation ──────────────────────────────────────
      case "worktreeCreate": {
        const taskId = msg.taskId as string;
        if (!taskId) break;
        const branch = `task/${taskId}`;
        const worktreePath = join(this.primaryRoot, ".worktrees", taskId);
        if (existsSync(worktreePath)) {
          vscode.window.showInformationMessage(`Worktree already exists: ${worktreePath}`);
          break;
        }
        try {
          const exec = promisify(execFile);
          // Check if branch already exists
          let branchExists = false;
          try {
            await exec("git", ["rev-parse", "--verify", branch], { cwd: this.primaryRoot });
            branchExists = true;
          } catch { /* branch does not exist */ }
          if (branchExists) {
            await exec("git", ["worktree", "add", worktreePath, branch], { cwd: this.primaryRoot });
          } else {
            await exec("git", ["worktree", "add", worktreePath, "-b", branch], { cwd: this.primaryRoot });
          }
          vscode.window.showInformationMessage(`✅ Worktree created: ${worktreePath} (branch: ${branch})`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to create worktree: ${message}`);
        }
        break;
      }
      case "worktreeCleanup": {
        const taskId = msg.taskId as string;
        if (!taskId) break;
        const worktreePath = join(this.primaryRoot, ".worktrees", taskId);
        if (!existsSync(worktreePath)) {
          vscode.window.showInformationMessage(`No worktree found for task ${taskId}`);
          break;
        }
        try {
          await rm(worktreePath, { recursive: true, force: true });
          const exec = promisify(execFile);
          await exec("git", ["worktree", "prune"], { cwd: this.primaryRoot });
          vscode.window.showInformationMessage(`🗑️ Worktree removed for task ${taskId}`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to remove worktree: ${message}`);
        }
        break;
      }
      case "createPr": {
        const taskId = msg.taskId as string;
        if (!taskId) break;
        const md = [
          `# Create PR — Task ${taskId}`, "",
          "Run the following in your AI agent to create a PR:", "",
          "```",
          `Call the MCP tool pr_create with task_id: "${taskId}" to create a GitHub draft PR pre-filled from the task file.`,
          "```",
          "",
          "Or manually:",
          "```bash",
          `gh pr create --draft --title "Task ${taskId}" --base main`,
          "```",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      case "startFeatureLoop": {
        const taskId = msg.taskId as string;
        if (!taskId) break;
        const md = [
          `# 🚀 Feature Loop — Task ${taskId}`, "",
          "Run the following in your AI agent to execute the full feature loop:", "",
          "```",
          `Call the MCP tool feature_loop with task_id: "${taskId}" to get the step-by-step orchestration plan, then execute each step in order.`,
          "```", "",
          "**The loop will:**",
          "1. 📋 Read the task and plan the approach",
          "2. 🌿 Create a git worktree and branch",
          "3. 🔨 Implement (you write the code)",
          "4. 🔒 Run security review checklist",
          "5. ⚡ Run performance review checklist",
          "6. 🔀 Create a draft PR",
          "7. ✅ Move task to done",
          "8. 🧠 Extract compound learnings",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      case "startFeatureLoopAll": {
        const md = [
          `# 🚀 Feature Loop All — Batch Processing`, "",
          "Run the following in your AI agent to process ALL pending tasks:", "",
          "```",
          `Call the MCP tool feature_loop_all to get a batch orchestration plan for all TODO tasks, then execute each task's steps in order.`,
          "```", "",
          "**Options:**",
          "- `include_wip: true` — also resume WIP tasks",
          "- `include_done: true` — extract compound learnings from done tasks",
          "- `prd_filter: \"0004\"` — only tasks for a specific PRD", "",
          "**The batch plan includes:**",
          "1. 📋 Per-task orchestration steps (Plan → Implement → Review → Done → Compound)",
          "2. 📊 PRD coverage summary",
          "3. 🔄 Post-batch sync steps (docs, brain, AGENTS.md, memory dedup)",
        ].join("\n");
        const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
        break;
      }
      // ── Skills ──────────────────────────────────────────────────
      case "initSkills":
      case "refreshSkills": {
        this._skills = await scanSkills(this.primaryRoot);
        this.refresh();
        const count = this._skills.length;
        vscode.window.showInformationMessage(`⚙️ Found ${count} skill${count !== 1 ? "s" : ""} in codebase.`);
        break;
      }
      case "createSkill": {
        const name = await vscode.window.showInputBox({
          prompt: "Skill name (kebab-case)",
          placeHolder: "my-custom-skill",
        });
        if (!name) break;
        const description = await vscode.window.showInputBox({
          prompt: "One-line description",
          placeHolder: "What does this skill do?",
        }) ?? "";
        const skillDir = join(this.primaryRoot, ".agents", "skills");
        await mkdir(skillDir, { recursive: true });
        const skillPath = join(skillDir, `${name}.md`);
        const template = [
          `# Skill: ${name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
          "",
          `${description || "Describe what this skill does and when to use it."}`,
          "",
          "## When to Use",
          "",
          "- Trigger condition 1",
          "- Trigger condition 2",
          "",
          "## Instructions",
          "",
          "1. Step one",
          "2. Step two",
          "",
        ].join("\n");
        await writeFile(skillPath, template, "utf-8");
        const doc = await vscode.workspace.openTextDocument(skillPath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`✨ Created skill: ${name}.md`);
        this._skills = await scanSkills(this.primaryRoot);
        this.refresh();
        break;
      }
      case "importVercelSkills": {
        const imported = await importVercelToLocal(this.primaryRoot);
        if (imported > 0) {
          this._skills = await scanSkills(this.primaryRoot);
          this.refresh();
          vscode.window.showInformationMessage(`▲ Imported ${imported} Vercel skill${imported !== 1 ? "s" : ""} to .agents/skills/`);
        } else {
          vscode.window.showInformationMessage("No Vercel v0 skill files found to import.");
        }
        break;
      }
      case "openSkill": {
        const path = msg.path as string;
        if (!path) break;
        const uri = vscode.Uri.file(join(this.primaryRoot, path));
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        break;
      }
      case "setupAgentSkills": {
        const agent = msg.agent as string;
        if (!agent) break;
        await distributeSkills(this.primaryRoot, agent);
        break;
      }
      // ── Docs ────────────────────────────────────────────────────
      case "openPrd": {
        const filename = msg.filename as string;
        if (!filename) break;
        const prdDir = join(this.primaryRoot, "docs", "prd");
        const uri = vscode.Uri.file(join(prdDir, filename));
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        break;
      }
      case "openAdr": {
        const filename = msg.filename as string;
        if (!filename) break;
        const adrDir = join(this.primaryRoot, "docs", "decisions");
        const uri = vscode.Uri.file(join(adrDir, filename));
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
        break;
      }
      // ── Project Init ──────────────────────────────────────────
      case "initProject": {
        const command = msg.command as string;
        const projectName = msg.projectName as string;
        const initKanbanWorkflow = msg.initKanban as boolean;
        if (!command || !projectName) break;

        try {
          const projectDir = join(this.primaryRoot, projectName);
          await mkdir(projectDir, { recursive: true });

          // Run the scaffolding command in the project directory
          const exec = promisify(execFile);
          const isWindows = process.platform === "win32";
          const shell = isWindows ? "cmd" : "sh";
          const shellFlag = isWindows ? "/c" : "-c";

          // Replace `.` with actual project dir path in the command
          const resolvedCommand = command.replace(/\s\.\s/, ` ${projectDir} `).replace(/\s\.$/, ` ${projectDir}`);

          await exec(shell, [shellFlag, resolvedCommand], {
            cwd: projectDir,
            timeout: 120_000,
          });

          // Optionally init Kanban workflow structure
          if (initKanbanWorkflow) {
            for (const dir of ["docs/prd", "docs/tasks", "docs/tasks/done", "docs/decisions"]) {
              await mkdir(join(projectDir, dir), { recursive: true });
            }
            await mkdir(join(projectDir, ".agents", "workflows"), { recursive: true });
            await mkdir(join(projectDir, ".agents", "templates"), { recursive: true });
            await mkdir(join(projectDir, ".agents", "skills"), { recursive: true });

            // Write a basic AGENTS.md if not exists
            const agentsPath = join(projectDir, "AGENTS.md");
            if (!existsSync(agentsPath)) {
              const agentsMd = [
                "# AGENTS.md",
                "",
                "Instructions for AI coding agents working in this repo.",
                "",
                "## Project",
                "",
                `**${projectName}** — Created with Agent Kanban`,
                "",
                "## Commands",
                "",
                "| Task | Command |",
                "| ---- | ------- |",
                "| Install deps | `npm install` |",
                "| Dev | `npm run dev` |",
                "| Build | `npm run build` |",
                "",
              ].join("\n");
              await writeFile(agentsPath, agentsMd, "utf-8");
            }
          }

          this._view?.webview.postMessage({
            type: "initResult",
            success: true,
            message: `Project "${projectName}" created successfully!${initKanbanWorkflow ? " Kanban workflow initialized." : ""}`,
          });

          // Offer to open the new project
          const openAction = await vscode.window.showInformationMessage(
            `✨ Project "${projectName}" scaffolded!`,
            "Open Folder",
          );
          if (openAction === "Open Folder") {
            await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectDir));
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this._view?.webview.postMessage({
            type: "initResult",
            success: false,
            message: `Failed: ${message}`,
          });
          vscode.window.showErrorMessage(`Init failed: ${message}`);
        }
        break;
      }
      case "initFromTemplate": {
        const templateId = msg.templateId as string;
        if (!templateId) break;

        try {
          // Ask for target directory
          const targetName = await vscode.window.showInputBox({
            prompt: "Project directory name",
            placeHolder: "my-project",
            value: "my-project",
          });
          if (!targetName) break;

          const projectDir = join(this.primaryRoot, targetName);

          // Run the CLI create-kanban-app command
          const exec = promisify(execFile);
          await exec("npx", ["-y", "create-kanban-app", projectDir, "--template", templateId], {
            cwd: this.primaryRoot,
            timeout: 120_000,
          });

          const openAction = await vscode.window.showInformationMessage(
            `✨ Template "${templateId}" scaffolded into ${targetName}!`,
            "Open Folder",
          );
          if (openAction === "Open Folder") {
            await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectDir));
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Template init failed: ${message}`);
        }
        break;
      }
      // ── i18n ─────────────────────────────────────────────────
      case "i18n_refresh": {
        const i18n = await scanI18n(this.primaryRoot);
        this._view?.webview.postMessage({ type: "i18nUpdated", i18n });
        break;
      }
      case "i18n_openFile": {
        const filePath = msg.filePath as string;
        if (!filePath) break;
        try {
          const uri = vscode.Uri.file(filePath);
          const doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Could not open file: ${message}`);
        }
        break;
      }
      case "i18n_saveTranslation": {
        const filePath = msg.filePath as string;
        const key = msg.key as string;
        const value = msg.value as string;
        if (!filePath || !key) break;
        try {
          let json: Record<string, unknown> = {};
          if (existsSync(filePath)) {
            json = JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
          }
          setNestedKey(json, key, value);
          await writeFile(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
          const i18n = await scanI18n(this.primaryRoot);
          this._view?.webview.postMessage({ type: "i18nUpdated", i18n });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Save translation failed: ${message}`);
        }
        break;
      }
      case "i18n_addKey": {
        const keyToAdd = msg.key as string;
        const defaultValue = (msg.defaultValue as string) ?? "";
        if (!keyToAdd) break;
        try {
          const i18n = await scanI18n(this.primaryRoot);
          for (const localeData of i18n.locales) {
            let json: Record<string, unknown> = {};
            if (existsSync(localeData.filePath)) {
              json = JSON.parse(await readFile(localeData.filePath, "utf-8")) as Record<string, unknown>;
            }
            if (!getNestedKey(json, keyToAdd)) {
              setNestedKey(json, keyToAdd, localeData.locale === i18n.defaultLocale ? defaultValue : "");
              await mkdir(dirname(localeData.filePath), { recursive: true });
              await writeFile(localeData.filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
            }
          }
          const updated = await scanI18n(this.primaryRoot);
          this._view?.webview.postMessage({ type: "i18nUpdated", i18n: updated });
          vscode.window.showInformationMessage(`Added key "${keyToAdd}" to all locale files.`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Add key failed: ${message}`);
        }
        break;
      }
      case "i18n_deleteKey": {
        const keyToDel = msg.key as string;
        if (!keyToDel) break;
        try {
          const i18n = await scanI18n(this.primaryRoot);
          for (const localeData of i18n.locales) {
            if (!existsSync(localeData.filePath)) continue;
            const json = JSON.parse(await readFile(localeData.filePath, "utf-8")) as Record<string, unknown>;
            deleteNestedKey(json, keyToDel);
            await writeFile(localeData.filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
          }
          const updated = await scanI18n(this.primaryRoot);
          this._view?.webview.postMessage({ type: "i18nUpdated", i18n: updated });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Delete key failed: ${message}`);
        }
        break;
      }
    }
  }

  private async _updateWebview() {
    if (!this._view) return;
    try {
      const multiRoot = this.workspaceRoots.length > 1;

      // Aggregate boards from all active roots
      const boardResults = await Promise.allSettled(
        this.workspaceRoots.map(entry => scanBoard(entry.path).then(b => ({ board: b, entry }))),
      );
      const board = _mergeBoards(boardResults, multiRoot);

      // Docs, skills, knowledge from primary root only
      const [prds, adrs, tasks] = await Promise.all([
        scanPrds(this.primaryRoot),
        scanAdrs(this.primaryRoot),
        scanTasks(this.primaryRoot),
      ]);
      const docs = { prds, adrs, tasks };
      const skills = this._skills;
      const knowledge = await this._scanKnowledge();
      const allFolders = vscode.workspace.workspaceFolders ?? [];
      const activePaths = new Set(this.workspaceRoots.map(r => r.path));
      const workspaces = allFolders.length > 1
        ? allFolders.map(f => ({ name: f.name, path: f.uri.fsPath, active: activePaths.has(f.uri.fsPath) }))
        : [];

      void this._view.webview.postMessage({
        type: "boardUpdated",
        board,
        docs,
        skills,
        knowledge,
        version: this._version,
        workspaces,
      });
    } catch {
      // Ignored
    }
  }

  /** Scan knowledge data: PROJECT_BRAIN.md + memory overview. */
  private async _scanKnowledge(): Promise<KnowledgeData> {
    let brainContent = "";
    let brainExists = false;
    const brainPath = join(this.primaryRoot, "docs", "PROJECT_BRAIN.md");
    if (existsSync(brainPath)) {
      brainContent = await readFile(brainPath, "utf-8");
      brainExists = true;
    }

    const memories: KnowledgeMemory[] = [];
    const categories: Record<string, number> = {};
    try {
      const store = createMemoryBackend(this.primaryRoot);
      try {
        const all = await Promise.resolve(store.overview());
        for (const m of all) {
          memories.push({
            id: m.id,
            category: m.category,
            slug: m.slug,
            abstract: m.l0_abstract,
            tokenCount: m.token_count,
          });
          categories[m.category] = (categories[m.category] || 0) + 1;
        }
      } finally {
        store.close();
      }
    } catch {
      // Memory store may not exist yet — that's fine
    }

    return {
      brainContent,
      brainExists,
      memories,
      categories,
      totalMemories: memories.length,
    };
  }
}

// ── Board merger ──────────────────────────────────────────────────────────────

const STATUS_ORDER = ["todo", "wip", "verified", "done", "achieved", "blocked"] as const;
const COLUMN_LABELS: Record<string, string> = {
  todo: "TODO", wip: "WIP", verified: "VERIFIED", done: "DONE", achieved: "ACHIEVED", blocked: "BLOCKED",
};

function _mergeBoards(
  results: PromiseSettledResult<{ board: CoreBoard; entry: WorkspaceEntry }>[],
  multiRoot: boolean,
): { totalTasks: number; columns: Array<{ status: string; label: string; tasks: unknown[] }> } {
  const columnMap = new Map<string, unknown[]>();
  for (const s of STATUS_ORDER) columnMap.set(s, []);

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { board, entry } = result.value;
    for (const col of board.columns) {
      const bucket = columnMap.get(col.status) ?? [];
      for (const task of col.tasks) {
        bucket.push({
          ...task,
          acceptance: task.acceptance.map(a => ({ text: a.text, checked: a.checked })),
          projectRoot: entry.path,
          projectName: multiRoot ? entry.name : undefined,
        });
      }
      columnMap.set(col.status, bucket);
    }
  }

  const columns = STATUS_ORDER.map(status => ({
    status,
    label: COLUMN_LABELS[status],
    tasks: columnMap.get(status) ?? [],
  }));

  return {
    totalTasks: columns.reduce((sum, col) => sum + col.tasks.length, 0),
    columns,
  };
}

// ── Skills scanner ─────────────────────────────────────────────────────────────

/** YAML frontmatter pattern for SKILL.md files. */
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;

/** Extract name/description from YAML frontmatter or heading. */
function parseSkillMeta(content: string, filePath: string): { name: string; description: string } {
  let name = basename(filePath, extname(filePath));
  let description = "";

  // Try YAML frontmatter first
  const fmMatch = content.match(FRONTMATTER_RE);
  if (fmMatch) {
    const yaml = fmMatch[1];
    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    const descMatch = yaml.match(/^description:\s*(.+)$/m);
    if (nameMatch) name = nameMatch[1].replace(/^["']|["']$/g, "").trim();
    if (descMatch) description = descMatch[1].replace(/^["']|["']$/g, "").trim();
  }

  // Fallback: use first H1 heading as name
  if (name === basename(filePath, extname(filePath))) {
    const h1Match = content.match(/^#\s+(?:Skill:\s*)?(.+)$/m);
    if (h1Match) name = h1Match[1].trim();
  }

  // Fallback: use first non-heading, non-empty line as description
  if (!description) {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
        description = trimmed.slice(0, 120);
        break;
      }
    }
  }

  return { name, description };
}

/** Recursively list .md files in a directory. */
async function listMdFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listMdFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Scan the workspace for skill files across all known agent formats. */
async function scanSkills(workspaceRoot: string): Promise<SkillInfo[]> {
  const skills: SkillInfo[] = [];

  // 1. Local skills: .agents/skills/**/*.md
  const localDir = join(workspaceRoot, ".agents", "skills");
  const localFiles = await listMdFiles(localDir);
  for (const filePath of localFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const meta = parseSkillMeta(content, filePath);
      skills.push({
        slug: basename(filePath, ".md"),
        name: meta.name,
        description: meta.description,
        format: "local",
        path: relative(workspaceRoot, filePath).replace(/\\/g, "/"),
        active: true,
      });
    } catch { /* skip unreadable files */ }
  }

  // 2. Cursor rules: .cursor/rules/**/*.md or .cursorrules
  const cursorDir = join(workspaceRoot, ".cursor", "rules");
  const cursorFiles = await listMdFiles(cursorDir);
  for (const filePath of cursorFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const meta = parseSkillMeta(content, filePath);
      skills.push({
        slug: `cursor-${basename(filePath, ".md")}`,
        name: meta.name,
        description: meta.description,
        format: "cursor",
        path: relative(workspaceRoot, filePath).replace(/\\/g, "/"),
        active: true,
      });
    } catch { /* skip */ }
  }
  // Legacy .cursorrules file
  const cursorRulesPath = join(workspaceRoot, ".cursorrules");
  if (existsSync(cursorRulesPath)) {
    try {
      const content = await readFile(cursorRulesPath, "utf-8");
      skills.push({
        slug: "cursorrules",
        name: "Cursor Rules",
        description: content.slice(0, 120).replace(/\n/g, " ").trim(),
        format: "cursor",
        path: ".cursorrules",
        active: true,
      });
    } catch { /* skip */ }
  }

  // 3. Copilot: .github/copilot-instructions.md
  const copilotPath = join(workspaceRoot, ".github", "copilot-instructions.md");
  if (existsSync(copilotPath)) {
    try {
      const content = await readFile(copilotPath, "utf-8");
      const meta = parseSkillMeta(content, copilotPath);
      skills.push({
        slug: "copilot-instructions",
        name: meta.name || "Copilot Instructions",
        description: meta.description,
        format: "copilot",
        path: ".github/copilot-instructions.md",
        active: true,
      });
    } catch { /* skip */ }
  }

  // 4. Claude: .claude/ or CLAUDE.md
  const claudeMdPath = join(workspaceRoot, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    try {
      const content = await readFile(claudeMdPath, "utf-8");
      skills.push({
        slug: "claude-md",
        name: "Claude Config",
        description: content.slice(0, 120).replace(/\n/g, " ").trim(),
        format: "claude",
        path: "CLAUDE.md",
        active: true,
      });
    } catch { /* skip */ }
  }

  // 5. Vercel v0: .v0/**/*.md or v0-*.md
  const v0Dir = join(workspaceRoot, ".v0");
  const v0Files = await listMdFiles(v0Dir);
  for (const filePath of v0Files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const meta = parseSkillMeta(content, filePath);
      skills.push({
        slug: `v0-${basename(filePath, ".md")}`,
        name: meta.name,
        description: meta.description,
        format: "vercel",
        path: relative(workspaceRoot, filePath).replace(/\\/g, "/"),
        active: true,
      });
    } catch { /* skip */ }
  }

  return skills;
}

/** Import Vercel v0 skills to local .agents/skills/ format. */
async function importVercelToLocal(workspaceRoot: string): Promise<number> {
  const v0Dir = join(workspaceRoot, ".v0");
  if (!existsSync(v0Dir)) return 0;

  const v0Files = await listMdFiles(v0Dir);
  if (v0Files.length === 0) return 0;

  const skillDir = join(workspaceRoot, ".agents", "skills");
  await mkdir(skillDir, { recursive: true });

  let count = 0;
  for (const filePath of v0Files) {
    const destName = `v0-${basename(filePath)}`;
    const destPath = join(skillDir, destName);
    if (!existsSync(destPath)) {
      await copyFile(filePath, destPath);
      count++;
    }
  }
  return count;
}

/** Distribute local skills to a target agent's config directory. */
async function distributeSkills(workspaceRoot: string, agent: string): Promise<void> {
  const localDir = join(workspaceRoot, ".agents", "skills");
  if (!existsSync(localDir)) {
    vscode.window.showWarningMessage("No local skills found. Run 'Init from Codebase' first.");
    return;
  }

  const localFiles = await listMdFiles(localDir);
  if (localFiles.length === 0) {
    vscode.window.showWarningMessage("No local skills found in .agents/skills/.");
    return;
  }

  let targetDir: string;
  let infoMessage: string;

  switch (agent) {
    case "local":
      vscode.window.showInformationMessage(`📁 ${localFiles.length} skill(s) already in .agents/skills/`);
      return;
    case "cursor": {
      targetDir = join(workspaceRoot, ".cursor", "rules");
      infoMessage = ".cursor/rules/";
      break;
    }
    case "copilot": {
      // Copilot uses a single instructions file — concatenate all skills
      const destPath = join(workspaceRoot, ".github", "copilot-instructions.md");
      await mkdir(join(workspaceRoot, ".github"), { recursive: true });
      const parts: string[] = ["# Agent Skills\n"];
      for (const filePath of localFiles) {
        try {
          const content = await readFile(filePath, "utf-8");
          parts.push(`\n---\n\n${content}`);
        } catch { /* skip */ }
      }
      await writeFile(destPath, parts.join("\n"), "utf-8");
      vscode.window.showInformationMessage(`💎 Exported ${localFiles.length} skill(s) → .github/copilot-instructions.md`);
      return;
    }
    case "claude": {
      // Claude uses CLAUDE.md — concatenate all skills
      const destPath = join(workspaceRoot, "CLAUDE.md");
      const parts: string[] = ["# Agent Skills\n"];
      for (const filePath of localFiles) {
        try {
          const content = await readFile(filePath, "utf-8");
          parts.push(`\n---\n\n${content}`);
        } catch { /* skip */ }
      }
      await writeFile(destPath, parts.join("\n"), "utf-8");
      vscode.window.showInformationMessage(`🤖 Exported ${localFiles.length} skill(s) → CLAUDE.md`);
      return;
    }
    case "antigravity": {
      const homeDir = process.env.USERPROFILE || process.env.HOME || "";
      targetDir = join(homeDir, ".gemini", "antigravity", "skills");
      infoMessage = "~/.gemini/antigravity/skills/";
      break;
    }
    case "vercel": {
      targetDir = join(workspaceRoot, ".v0");
      infoMessage = ".v0/";
      break;
    }
    default:
      vscode.window.showErrorMessage(`Unknown agent target: ${agent}`);
      return;
  }

  // Copy files for directory-based agents
  await mkdir(targetDir, { recursive: true });
  let count = 0;
  for (const filePath of localFiles) {
    const destPath = join(targetDir, basename(filePath));
    await copyFile(filePath, destPath);
    count++;
  }
  vscode.window.showInformationMessage(`📦 Distributed ${count} skill(s) → ${infoMessage}`);
}

// ── AGENTS.md Generator ──────────────────────────────────────────────────────

/** Detect package manager from lockfiles. */
function detectPackageManager(root: string): string {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "bun.lockb"))) return "bun";
  return "npm";
}

/** Read JSON file safely. */
async function readJsonSafe(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Build compact tree of top-level entries. */
async function buildTopTree(root: string): Promise<string[]> {
  const lines: string[] = [basename(root) + "/"];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const filtered = entries
      .filter(e => !e.name.startsWith(".") || e.name === ".agents")
      .filter(e => !["node_modules", "dist", ".git"].includes(e.name))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    for (let i = 0; i < filtered.length; i++) {
      const e = filtered[i];
      const connector = i === filtered.length - 1 ? "└── " : "├── ";
      lines.push(`${connector}${e.name}${e.isDirectory() ? "/" : ""}`);
    }
  } catch { /* skip */ }
  return lines;
}


/**
 * Generate AGENTS.md in the workspace root.
 * Scans the project context and optionally includes
 * Context7 and Playwright companion server documentation.
 */
async function initAgentsMd(
  workspaceRoot: string,
  includeContext7: boolean,
  includePlaywright: boolean,
): Promise<void> {
  try {
    const pkg = (await readJsonSafe(join(workspaceRoot, "package.json"))) ?? {};
    const scripts = (pkg.scripts as Record<string, string>) ?? {};
    const pm = detectPackageManager(workspaceRoot);
    const name = (pkg.name as string) ?? basename(workspaceRoot);
    const desc = (pkg.description as string) ?? "";

    // Detect basics
    const isMonorepo = existsSync(join(workspaceRoot, "pnpm-workspace.yaml"))
      || Boolean(pkg.workspaces);
    const hasTs = existsSync(join(workspaceRoot, "tsconfig.json"));
    const hasDocsDir = existsSync(join(workspaceRoot, "docs"));
    const hasAgentsDir = existsSync(join(workspaceRoot, ".agents"));

    // Detect packages in monorepo
    const packages: Array<{ name: string; path: string; desc: string }> = [];
    if (isMonorepo && existsSync(join(workspaceRoot, "packages"))) {
      const entries = await readdir(join(workspaceRoot, "packages"));
      for (const entry of entries) {
        const subPkg = await readJsonSafe(join(workspaceRoot, "packages", entry, "package.json"));
        if (subPkg) {
          packages.push({
            name: (subPkg.name as string) ?? entry,
            path: `packages/${entry}`,
            desc: (subPkg.description as string) ?? "",
          });
        }
      }
    }

    // Build tree
    const tree = await buildTopTree(workspaceRoot);

    // ── Compose AGENTS.md ──
    const lines: string[] = [];

    lines.push("# AGENTS.md", "");
    lines.push("Instructions for AI coding agents working in this repo.", "");

    // Project
    lines.push("## Project", "");
    lines.push(`**${name}**${desc ? ` — ${desc}` : ""}`, "");
    if (packages.length > 0) {
      lines.push(`This is a ${pm} monorepo with ${packages.length} packages:`, "");
      for (const p of packages) {
        lines.push(`- **\`${p.name}\`** (${p.path})${p.desc ? ` — ${p.desc}` : ""}`);
      }
      lines.push("");
    }

    // Tech Stack
    lines.push("## Tech Stack", "");
    lines.push("| Layer | Choice |");
    lines.push("| ----- | ------ |");
    lines.push(`| Language | ${hasTs ? "TypeScript" : "JavaScript"} |`);
    lines.push(`| Package Manager | ${pm}${isMonorepo ? " (monorepo)" : ""} |`);
    lines.push("");
    lines.push("Do **not** add new packages without asking. Propose with a one-line reason first.", "");

    // Commands
    if (Object.keys(scripts).length > 0) {
      lines.push("## Commands", "");
      lines.push("| Task | Command |");
      lines.push("| ---- | ------- |");
      lines.push(`| Install deps | \`${pm} install\` |`);
      for (const s of ["build", "dev", "test", "lint", "typecheck", "clean", "start"]) {
        if (scripts[s]) lines.push(`| ${s.charAt(0).toUpperCase() + s.slice(1)} | \`${pm} ${s}\` |`);
      }
      lines.push("");
      lines.push(`Always run \`${pm} build\` and \`${pm} test\` before saying a task is done.`, "");
    }

    // Structure
    lines.push("## Project Structure", "");
    lines.push("```");
    for (const line of tree) lines.push(line);
    lines.push("```", "");

    // Coding Conventions
    lines.push("## Coding Conventions", "");
    if (hasTs) {
      lines.push("- **File names**: `kebab-case.ts`. Class names: `PascalCase`. Variables: `camelCase`.");
      lines.push("- **Imports**: `node:` prefix for builtins. Package imports first, then relative.");
      lines.push("- **Type-only imports**: use `import type { ... }` when importing only types.");
      lines.push("- **No `any`** — use proper TypeScript types.");
    } else {
      lines.push("- **File names**: `kebab-case.js`. Variables: `camelCase`.");
    }
    lines.push("- **Functions over classes** when there's no internal state.");
    lines.push("- **No `console.log`** in library code — return structured data.", "");

    // Workflow
    if (hasDocsDir || hasAgentsDir) {
      lines.push("## Workflow", "");
      if (hasAgentsDir) {
        lines.push("When the user gives you a **PRD** or **task file**, follow the loop in `.agents/workflows/feature-loop.md`.", "");
        lines.push("When making a **non-trivial architectural choice**, write an ADR using `.agents/templates/adr.md`.", "");
        lines.push("When the user describes a **new feature in chat without a PRD**, offer to draft one first.", "");
      }
      if (hasDocsDir) {
        lines.push("Task files in `docs/tasks/` use a status prefix in the filename:", "");
        lines.push("| Prefix | Meaning |");
        lines.push("| ------ | ------- |");
        lines.push("| `todo-` | Not started |");
        lines.push("| `wip-` | In progress |");
        lines.push("| `verified-` | QA Verified |");
        lines.push("| `done-` | Completed |");
        lines.push("| `blocked-` | Blocked, see Notes section |");
        lines.push("");
        lines.push("Rename the file to update status — don't edit a status field inside.", "");
      }
    }

    // MCP Companion Servers
    if (includeContext7 || includePlaywright) {
      lines.push("## MCP Companion Servers", "");
      lines.push("This project relies on multiple MCP servers working together. Configure them in your IDE's MCP settings:", "");
      lines.push("| Server | Purpose | When to use |");
      lines.push("|--------|---------|-------------|");
      lines.push("| **agent-kanban** | Task management, memory, PRDs, ADRs | Always — core workflow orchestration |");
      if (includeContext7) lines.push("| **context7** | Live documentation lookup | Before using any library API, framework feature, or CLI tool |");
      if (includePlaywright) lines.push("| **playwright** | Browser automation & testing | UI verification, E2E testing, visual regression |");
      lines.push("");

      if (includeContext7) {
        lines.push(
          "### Context7 — Documentation-First Development", "",
          "**Always use Context7 before writing code that touches a library or framework** — even well-known ones. Your training data may be stale; Context7 fetches the latest docs.", "",
          "**Workflow:**",
          "1. Call `resolve-library-id` to find the Context7 library ID",
          "2. Call `query-docs` with the resolved ID and your specific question",
          "3. If the first answer is insufficient, retry with `researchMode: true`", "",
          "**When to use:**",
          "- API syntax or configuration for any dependency",
          "- Version migration or breaking change checks",
          "- Library-specific debugging or setup instructions",
          "- CLI tool usage patterns", "",
        );
      }

      if (includePlaywright) {
        lines.push(
          "### Playwright — Browser Automation & Testing", "",
          "**Use Playwright for any task that requires interacting with or verifying a running web application.**", "",
          "**When to use:**",
          "- Verifying UI renders correctly after changes",
          "- E2E testing of web-based features",
          "- Taking screenshots for visual comparison",
          "- Filling forms, clicking buttons, navigating pages", "",
          "**Rule:** When acceptance criteria include UI behavior, use Playwright to verify before marking done.", "",
        );
      }
    }

    // What to Ask vs Assume
    lines.push("## What to Ask vs Assume", "");
    lines.push("**Ask the user before:**", "");
    lines.push("- Adding any new dependency");
    if (isMonorepo) lines.push("- Changing the monorepo structure");
    lines.push("- Deleting files");
    lines.push("- Adding external API calls");
    lines.push("- Starting a non-trivial task without a PRD");
    lines.push("");
    lines.push("**Assume and proceed when:**", "");
    lines.push("- Creating new modules/functions that follow existing patterns");
    lines.push("- Writing tests for new code");
    lines.push("- Fixing lint warnings or type errors");
    lines.push("- Adding JSDoc comments");
    lines.push("- Renaming a task file to update its status");
    if (includeContext7) lines.push("- Using Context7 to look up library documentation");
    if (includePlaywright) lines.push("- Using Playwright to verify UI changes");
    lines.push("");

    // Skills & References
    if (hasAgentsDir) {
      lines.push("## Skills & References", "");
      lines.push("| Task involves... | Read / Use |");
      lines.push("| ---------------- | ---------- |");
      lines.push("| Working from a PRD or task | `.agents/workflows/feature-loop.md` |");
      lines.push("| Writing a PRD | `.agents/templates/prd.md` |");
      lines.push("| Writing a task | `.agents/templates/task.md` |");
      lines.push("| Logging a decision | `.agents/templates/adr.md` |");
      if (includeContext7) lines.push("| Looking up library/framework docs | Context7 MCP → `resolve-library-id` then `query-docs` |");
      if (includePlaywright) lines.push("| Verifying UI or running E2E tests | Playwright MCP → `navigate`, `screenshot`, `click`, `fill` |");
      lines.push("");
    }

    // Definition of Done
    lines.push("## Definition of Done", "");
    lines.push("A task is done when:", "");
    let n = 1;
    lines.push(`${n++}. Code compiles (\`${pm} build\` clean)`);
    lines.push(`${n++}. Tests pass (\`${pm} test\`)`);
    lines.push(`${n++}. New behavior has at least one test`);
    if (hasTs) lines.push(`${n++}. No new TypeScript errors`);
    lines.push(`${n++}. Public APIs have a one-line JSDoc (\`/** ... */\`)`);
    if (hasDocsDir) lines.push(`${n++}. Task file renamed to \`done-*.md\``);
    lines.push("");

    // Write
    const agentsPath = join(workspaceRoot, "AGENTS.md");
    await writeFile(agentsPath, lines.join("\n"), "utf-8");

    const doc = await vscode.workspace.openTextDocument(agentsPath);
    await vscode.window.showTextDocument(doc);

    const companions: string[] = [];
    if (includeContext7) companions.push("Context7");
    if (includePlaywright) companions.push("Playwright");
    const companionNote = companions.length > 0 ? ` (with ${companions.join(" + ")})` : "";
    vscode.window.showInformationMessage(`✅ AGENTS.md created${companionNote}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to generate AGENTS.md: ${message}`);
  }
}

// ── i18n Scanner ─────────────────────────────────────────────────────────────

const LOCALE_DIRS = [
  "src/locales",
  "src/i18n",
  "public/locales",
  "locales",
  "i18n",
  "src/assets/i18n",
  "assets/i18n",
];

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".svelte", ".vue"];

/** Patterns that capture i18next keys: t('key'), i18n.t('key'), $t('key'), etc. */
const I18N_KEY_RE = /(?:\$t|i18n\.t|i18next\.t|\bt)\s*\(\s*['"`]([^'"`\s)]+)['"`]/g;

/** Recursively flatten nested JSON into dot-separated keys. */
function flattenJson(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof obj !== "object" || obj === null) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      Object.assign(out, flattenJson(v, fullKey));
    } else {
      out[fullKey] = String(v ?? "");
    }
  }
  return out;
}

/** Set a potentially-nested key (dot notation) on a JSON object. */
function setNestedKey(obj: Record<string, unknown>, key: string, value: string): void {
  const parts = key.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

/** Get a potentially-nested key (dot notation) from a JSON object. */
function getNestedKey(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Delete a potentially-nested key (dot notation) from a JSON object. */
function deleteNestedKey(obj: Record<string, unknown>, key: string): void {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur !== "object" || cur === null) return;
    cur = (cur as Record<string, unknown>)[parts[i]];
  }
  if (typeof cur === "object" && cur !== null) {
    delete (cur as Record<string, unknown>)[parts[parts.length - 1]];
  }
}

/** Recursively list all files with given extensions. */
async function listFilesByExt(dir: string, exts: string[]): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === ".cache") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...(await listFilesByExt(full, exts)));
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

/** Scan source code for i18n key usages. */
async function scanUsedKeys(workspaceRoot: string): Promise<string[]> {
  const keySet = new Set<string>();
  const srcDirs = ["src", "app", "pages", "components", "lib"];
  const filePaths: string[] = [];
  for (const d of srcDirs) {
    filePaths.push(...(await listFilesByExt(join(workspaceRoot, d), CODE_EXTENSIONS)));
  }
  // Also scan root-level .ts/.js
  try {
    const root = await readdir(workspaceRoot, { withFileTypes: true });
    for (const e of root) {
      if (!e.isDirectory() && CODE_EXTENSIONS.some(ext => e.name.endsWith(ext))) {
        filePaths.push(join(workspaceRoot, e.name));
      }
    }
  } catch { /* skip */ }

  for (const fp of filePaths) {
    try {
      const content = await readFile(fp, "utf-8");
      let m: RegExpExecArray | null;
      I18N_KEY_RE.lastIndex = 0;
      while ((m = I18N_KEY_RE.exec(content)) !== null) {
        keySet.add(m[1]);
      }
    } catch { /* skip */ }
  }
  return Array.from(keySet).sort();
}

/** Main i18n scanner: detect locale dir, load all locale files, compute coverage. */
async function scanI18n(workspaceRoot: string): Promise<I18nData> {
  // 1. Find locale directory
  let localeDir = "";
  for (const candidate of LOCALE_DIRS) {
    const full = join(workspaceRoot, candidate);
    if (existsSync(full)) { localeDir = full; break; }
  }

  // 2. Enumerate locale JSON files
  const locales: I18nLocaleData[] = [];
  if (localeDir) {
    let entries: { name: string; isDirectory: () => boolean }[] = [];
    try { entries = await readdir(localeDir, { withFileTypes: true }); } catch { /* skip */ }

    // Flat structure: localeDir/en.json
    const flatJsons = entries.filter(e => !e.isDirectory() && e.name.endsWith(".json"));
    if (flatJsons.length > 0) {
      for (const e of flatJsons) {
        const filePath = join(localeDir, e.name);
        try {
          const raw = JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
          locales.push({ locale: basename(e.name, ".json"), filePath, keys: flattenJson(raw) });
        } catch { /* skip */ }
      }
    } else {
      // Nested structure: localeDir/en/translation.json
      for (const e of entries.filter(e2 => e2.isDirectory())) {
        const subDir = join(localeDir, e.name);
        const subFiles = await readdir(subDir);
        const jsonFiles = subFiles.filter(f => f.endsWith(".json"));
        const merged: Record<string, string> = {};
        let primaryPath = join(subDir, "translation.json");
        for (const jf of jsonFiles) {
          const fp = join(subDir, jf);
          try {
            const raw = JSON.parse(await readFile(fp, "utf-8")) as Record<string, unknown>;
            Object.assign(merged, flattenJson(raw, jf === "translation.json" ? "" : basename(jf, ".json")));
            if (jf === "translation.json") primaryPath = fp;
          } catch { /* skip */ }
        }
        if (Object.keys(merged).length > 0 || jsonFiles.length > 0) {
          locales.push({ locale: e.name, filePath: primaryPath, keys: merged });
        }
      }
    }
  }

  // 3. Determine default locale
  const defaultLocale = locales.find(l => l.locale === "en")?.locale
    ?? locales.find(l => l.locale === "en-US")?.locale
    ?? locales[0]?.locale
    ?? "en";

  // 4. Scan source for used keys
  const usedKeys = await scanUsedKeys(workspaceRoot);

  // 5. Compute coverage
  const allKeys = locales.length > 0
    ? Array.from(new Set(locales.flatMap(l => Object.keys(l.keys))))
    : usedKeys;

  const coverage: I18nCoverageEntry[] = locales.map(l => {
    const total = allKeys.length;
    const missing = allKeys.filter(k => !l.keys[k] || l.keys[k].trim() === "");
    const translated = total - missing.length;
    return {
      locale: l.locale,
      total,
      translated,
      percentage: total > 0 ? Math.round((translated / total) * 100) : 100,
      missing,
    };
  });

  return {
    detected: localeDir !== "",
    localeDir: localeDir ? relative(workspaceRoot, localeDir).replace(/\\/g, "/") : "",
    defaultLocale,
    locales,
    usedKeys,
    coverage,
  };
}
