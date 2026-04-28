import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: true,
  minify: !watch,
};

function copyWebviewUI() {
  const src = path.resolve(__dirname, "webview-ui/dist");
  const dest = path.resolve(__dirname, "dist/webview-ui");
  if (fs.existsSync(src)) {
    console.log("Copying webview-ui dist to dist/webview-ui...");
    fs.cpSync(src, dest, { recursive: true, force: true });
  } else {
    console.warn("webview-ui dist not found. Run 'pnpm build' in webview-ui first.");
  }
}

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(config);
  copyWebviewUI();
  console.log("Build complete.");
}
