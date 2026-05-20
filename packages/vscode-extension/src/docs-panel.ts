import * as vscode from "vscode";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import {
  scanPrds,
  scanAdrs,
  scanTasks,
  type Prd,
  type Adr,
  type Task,
} from "@agent-kanban/core";
import { renderSvelteHtml, svelteResourceRoots } from "./svelte-host.js";

interface DocEntry {
  filename: string;
  title: string;
  status?: string;
  summary?: string;
  projectRoot?: string;
}

interface DocsData {
  prds: DocEntry[];
  adrs: DocEntry[];
  tasks: DocEntry[];
  testCases: DocEntry[];
}

/** Wide editor-area Docs viewer (PRDs, ADRs, Tasks, Test Cases). */
export class DocsPanel {
  private static current: DocsPanel | undefined;

  static async createOrShow(
    extensionPath: string,
    workspaceRoot: string,
  ): Promise<DocsPanel> {
    if (DocsPanel.current) {
      DocsPanel.current.workspaceRoot = workspaceRoot;
      DocsPanel.current.panel.reveal(vscode.ViewColumn.Active);
      await DocsPanel.current.refresh();
      return DocsPanel.current;
    }

    const panel = vscode.window.createWebviewPanel(
      "agentKanban.docsPanel",
      "Agent Kanban — Docs",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: svelteResourceRoots(extensionPath),
      },
    );

    DocsPanel.current = new DocsPanel(panel, extensionPath, workspaceRoot);
    await DocsPanel.current.init();
    return DocsPanel.current;
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionPath: string,
    private workspaceRoot: string,
  ) {
    panel.onDidDispose(() => {
      if (DocsPanel.current === this) DocsPanel.current = undefined;
    });
  }

  setWorkspaceRoot(path: string) {
    this.workspaceRoot = path;
    void this.refresh();
  }

  async refresh() {
    const docs = await this.scan();
    void this.panel.webview.postMessage({ type: "docsUpdated", docs });
  }

  private async init() {
    this.panel.webview.html = await renderSvelteHtml({
      entry: "docs.html",
      webview: this.panel.webview,
      extensionPath: this.extensionPath,
      title: "Agent Kanban — Docs",
    });
    this.panel.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    await this.refresh();
  }

  private async scan(): Promise<DocsData> {
    const [prds, adrs, tasks] = await Promise.all([
      scanPrds(this.workspaceRoot),
      scanAdrs(this.workspaceRoot),
      scanTasks(this.workspaceRoot),
    ]);
    const testCases = await this.scanTestCases();
    return {
      prds: prds.map(toPrdEntry),
      adrs: adrs.map(toAdrEntry),
      tasks: tasks.map(toTaskEntry),
      testCases,
    };
  }

  private async scanTestCases(): Promise<DocEntry[]> {
    const dir = join(this.workspaceRoot, "docs", "test-cases");
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir);
    const out: DocEntry[] = [];
    for (const name of entries) {
      if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
      try {
        const content = await readFile(join(dir, name), "utf-8");
        out.push(parseTestCase(name, content));
      } catch {
        /* skip unreadable */
      }
    }
    return out;
  }

  private async handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case "refresh":
        await this.refresh();
        break;
      case "openPrd":
        await this.openIn(
          join((msg.projectRoot as string) || this.workspaceRoot, "docs", "prd"),
          msg.filename as string,
        );
        break;
      case "openAdr":
        await this.openIn(
          join((msg.projectRoot as string) || this.workspaceRoot, "docs", "decisions"),
          msg.filename as string,
        );
        break;
      case "openTestCase":
        await this.openIn(
          join((msg.projectRoot as string) || this.workspaceRoot, "docs", "test-cases"),
          msg.filename as string,
        );
        break;
      case "openFile": {
        const filename = msg.filename as string;
        const root = (msg.projectRoot as string) || this.workspaceRoot;
        const isDone = filename.startsWith("done-");
        const dir = isDone
          ? join(root, "docs", "tasks", "done")
          : join(root, "docs", "tasks");
        await this.openIn(dir, filename);
        break;
      }
    }
  }

  private async openIn(dir: string, filename: string) {
    if (!filename) return;
    const file = join(dir, filename);
    if (!existsSync(file)) {
      vscode.window.showWarningMessage(`File not found: ${filename}`);
      return;
    }
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
  }
}

function toPrdEntry(p: Prd): DocEntry {
  return {
    filename: p.filename,
    title: p.title,
    status: p.status,
    summary: p.problem.split("\n").find((l) => l.trim()) ?? "",
  };
}

function toAdrEntry(a: Adr): DocEntry {
  return {
    filename: a.filename,
    title: `ADR-${a.id}: ${a.slug.replace(/-/g, " ")}`,
    status: a.status,
  };
}

function toTaskEntry(t: Task): DocEntry {
  return {
    filename: t.filename,
    title: t.goal || t.slug.replace(/-/g, " "),
    status: t.status,
  };
}

const TC_FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;

function parseTestCase(filename: string, content: string): DocEntry {
  let title = filename.replace(/\.md$/, "");
  let status: string | undefined;
  let summary: string | undefined;

  const fm = content.match(TC_FRONTMATTER_RE);
  if (fm) {
    const yaml = fm[1];
    const titleMatch = yaml.match(/^title:\s*(.+)$/m);
    const statusMatch = yaml.match(/^status:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].replace(/^["']|["']$/g, "").trim();
    if (statusMatch) status = statusMatch[1].replace(/^["']|["']$/g, "").trim();
  }

  // First non-heading paragraph after frontmatter as summary.
  const body = fm ? content.slice(fm[0].length) : content;
  const lines = body.split("\n").map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l || l.startsWith("#") || l.startsWith("---")) continue;
    summary = l.slice(0, 160);
    break;
  }

  return { filename, title, status, summary };
}
