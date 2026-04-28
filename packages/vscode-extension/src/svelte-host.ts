import * as vscode from "vscode";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Host-side glue for loading webviews built by `@agent-kanban/webview-ui`.
 *
 * The webview-ui package emits a Vite manifest at `dist/.vite/manifest.json`
 * that maps each entry HTML (`sidebar.html`, `board.html`, `docs.html`) to
 * its hashed JS + CSS assets. We read it, rewrite paths through
 * `webview.asWebviewUri`, and wrap them in a CSP-locked HTML shell.
 */

interface ViteManifestChunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
  assets?: string[];
}

type ViteManifest = Record<string, ViteManifestChunk>;

/** Resolve the webview-ui `dist/` directory in dev (sibling package) or VSIX (bundled). */
export function resolveWebviewDistDir(extensionPath: string): string {
  // Sibling package (dev / monorepo)
  const sibling = resolve(extensionPath, "..", "webview-ui", "dist");
  if (existsSync(sibling)) return sibling;
  // Bundled into the VSIX
  const bundled = resolve(extensionPath, "dist", "webview-ui");
  return bundled;
}

let cached: { distDir: string; manifest: ViteManifest } | null = null;

async function loadManifest(distDir: string): Promise<ViteManifest> {
  if (cached && cached.distDir === distDir) return cached.manifest;
  const path = join(distDir, ".vite", "manifest.json");
  const raw = await readFile(path, "utf-8");
  const manifest = JSON.parse(raw) as ViteManifest;
  cached = { distDir, manifest };
  return manifest;
}

/**
 * Resolve all transitive JS chunks an entry depends on, in load order
 * (dependencies first). Vite emits `imports` per chunk; we walk them.
 */
function resolveChunks(manifest: ViteManifest, entryKey: string): { js: string[]; css: string[] } {
  const js: string[] = [];
  const css: string[] = [];
  const seen = new Set<string>();

  function visit(key: string) {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    for (const imp of chunk.imports ?? []) visit(imp);
    js.push(chunk.file);
    for (const c of chunk.css ?? []) css.push(c);
  }

  visit(entryKey);
  return { js, css };
}

function makeNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let n = "";
  for (let i = 0; i < 32; i++) n += chars[Math.floor(Math.random() * chars.length)];
  return n;
}

export interface RenderOptions {
  /** Vite entry key — e.g. "sidebar.html", "board.html", "docs.html". */
  entry: "sidebar.html" | "board.html" | "docs.html";
  webview: vscode.Webview;
  extensionPath: string;
  title?: string;
}

/**
 * Build a fully nonced, CSP-locked HTML shell for one of the Svelte entries.
 * Throws a clear error if the manifest is missing — the user needs to run
 * `pnpm --filter @agent-kanban/webview-ui build` first in dev.
 */
export async function renderSvelteHtml(opts: RenderOptions): Promise<string> {
  const distDir = resolveWebviewDistDir(opts.extensionPath);
  if (!existsSync(join(distDir, ".vite", "manifest.json"))) {
    throw new Error(
      `webview-ui dist not found at ${distDir}. ` +
        `Run: pnpm --filter @agent-kanban/webview-ui build`,
    );
  }

  const manifest = await loadManifest(distDir);
  const { js, css } = resolveChunks(manifest, opts.entry);
  const nonce = makeNonce();

  const distUri = vscode.Uri.file(distDir);
  const toWebviewUri = (rel: string) =>
    opts.webview.asWebviewUri(vscode.Uri.joinPath(distUri, ...rel.split("/")));

  const cspSource = opts.webview.cspSource;
  const linkTags = css
    .map((c) => `<link rel="stylesheet" href="${toWebviewUri(c)}">`)
    .join("\n  ");
  // Entry script is the LAST in the resolved list (top-level entry).
  // Earlier scripts are dependency chunks that the entry imports — modulepreload
  // them so the browser fetches in parallel.
  const entryFile = js[js.length - 1];
  const preloadFiles = js.slice(0, -1);
  const preloadTags = preloadFiles
    .map((f) => `<link rel="modulepreload" href="${toWebviewUri(f)}" nonce="${nonce}">`)
    .join("\n  ");
  const scriptTag = `<script type="module" nonce="${nonce}" src="${toWebviewUri(entryFile)}"></script>`;

  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${cspSource} 'unsafe-inline';
    font-src ${cspSource};
    img-src ${cspSource} https: data:;
    script-src 'nonce-${nonce}';
    connect-src ${cspSource};
  ">
  <title>${opts.title ?? "Agent Kanban"}</title>
  ${linkTags}
  ${preloadTags}
</head>
<body>
  <div id="app"></div>
  ${scriptTag}
</body>
</html>`;
}

/** Compute the `localResourceRoots` a Svelte webview needs. */
export function svelteResourceRoots(extensionPath: string): vscode.Uri[] {
  const distDir = resolveWebviewDistDir(extensionPath);
  return [vscode.Uri.file(distDir)];
}

/** Reset the manifest cache — call after a webview-ui rebuild during dev. */
export function clearManifestCache() {
  cached = null;
}
