import { join } from "node:path";
import { loadMemoryConfig } from "./config.js";
import { MemoryStore } from "./store.js";
import { MemoryFileBackend } from "./file-backend.js";
import type { IMemoryBackend } from "./backend.js";

/**
 * Factory function that reads `.agent-kanban/config.json` and returns the
 * appropriate memory backend for the project.
 *
 * - `"sqlite"` (default): returns a `MemoryStore` backed by SQLite.
 * - `"files"`: returns a `MemoryFileBackend` storing Markdown files under `docs/memory/`.
 *
 * @param projectPath  Root of the project (where docs/ and .agent-kanban/ live).
 */
export function createMemoryBackend(projectPath: string): IMemoryBackend {
  const config = loadMemoryConfig(projectPath);

  if (config.backend === "files") {
    return new MemoryFileBackend(projectPath);
  }

  // Default: SQLite
  const dbPath = join(projectPath, ".agent-kanban", "memory.db");
  return new MemoryStore(dbPath);
}
