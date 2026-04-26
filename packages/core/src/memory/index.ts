// @agent-kanban/core — memory module barrel export

export type {
  MemoryCategory,
  Memory,
  MemoryCandidate,
  DedupDecision,
  DedupResult,
  SessionEntry,
  DedupeReport,
} from "./types.js";

export { MEMORY_CATEGORIES } from "./types.js";

export { extractMemories } from "./extractor.js";

export { similarity, deduplicateMemories, sweepDuplicates } from "./dedup.js";

export { MemoryStore } from "./store.js";

export type { IMemoryBackend } from "./backend.js";

export type { MemoryConfig, MemoryBackendId } from "./config.js";
export { loadMemoryConfig, saveMemoryConfig } from "./config.js";

export { MemoryFileBackend } from "./file-backend.js";

export { createMemoryBackend } from "./factory.js";
