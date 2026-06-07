import * as esbuild from "esbuild";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const mainConfig = {
  entryPoints: ["src/main/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  external: ["electron", "better-sqlite3", "@agent-kanban/core"],
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: true,
};

/** @type {esbuild.BuildOptions} */
const preloadConfig = {
  entryPoints: ["src/preload/preload.ts"],
  bundle: true,
  outfile: "dist/preload.js",
  external: ["electron"],
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: true,
};

async function build() {
  if (watch) {
    const mainCtx = await esbuild.context(mainConfig);
    const preloadCtx = await esbuild.context(preloadConfig);
    
    await mainCtx.watch();
    await preloadCtx.watch();
    
    console.log("⚡ Main and Preload build watching...");
    
    // Start Vite dev server in renderer
    console.log("⚡ Starting Vite dev server...");
    const viteProcess = spawn("npx", ["vite", "--host"], {
      stdio: "inherit",
      shell: true,
    });

    // Start Electron after a delay to let Vite start
    setTimeout(() => {
      console.log("⚡ Starting Electron...");
      const electronProcess = spawn("npx", ["electron", "."], {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: "development",
        },
      });

      electronProcess.on("close", () => {
        viteProcess.kill();
        mainCtx.dispose();
        preloadCtx.dispose();
        process.exit(0);
      });
    }, 2000);
  } else {
    await esbuild.build(mainConfig);
    await esbuild.build(preloadConfig);
    console.log("✨ Electron main and preload build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
