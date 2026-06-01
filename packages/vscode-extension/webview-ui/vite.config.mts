import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  base: "",
  resolve: {
    alias: {
      $lib: resolve(__dirname, "src/lib"),
      "@agent-kanban/core/kanban-ref": resolve(__dirname, "../../core/src/kanban-ref.ts"),
    },
  },
  root: __dirname,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, "sidebar.html"),
        board: resolve(__dirname, "board.html"),
        docs: resolve(__dirname, "docs.html"),
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
