import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

/** Supported memory backend identifiers. */
export type MemoryBackendId = "sqlite" | "files";

/** Persisted memory configuration shape. */
export interface MemoryConfig {
  backend: MemoryBackendId;
}

const CONFIG_REL = join(".agent-kanban", "config.json");

/** Default configuration used when no config file exists. */
const DEFAULT_CONFIG: MemoryConfig = { backend: "sqlite" };

/**
 * Load the memory config from `<projectPath>/.agent-kanban/config.json`.
 * Returns the default config if the file does not exist.
 */
export function loadMemoryConfig(projectPath: string): MemoryConfig {
  const configPath = join(projectPath, CONFIG_REL);
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const backend = (parsed.memory as Record<string, unknown> | undefined)?.backend;
    return {
      backend: backend === "files" ? "files" : "sqlite",
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save the memory config to `<projectPath>/.agent-kanban/config.json`.
 * Merges with any existing keys so other config values are preserved.
 */
export function saveMemoryConfig(projectPath: string, config: MemoryConfig): void {
  const configPath = join(projectPath, CONFIG_REL);
  mkdirSync(dirname(configPath), { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    } catch {
      // corrupt file — start fresh
    }
  }

  existing.memory = { ...(existing.memory as object | undefined), backend: config.backend };
  writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n", "utf-8");
}
