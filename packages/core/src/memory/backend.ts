import type { Memory, MemoryCategory, DedupResult } from "./types.js";

/**
 * Common interface implemented by all memory backends.
 * Enforces the L0/L1/L2 tier discipline: find/overview/getById return L0 only;
 * read() is the only method that returns full L2 content.
 */
export interface IMemoryBackend {
  /**
   * Persist a batch of DedupResult decisions.
   * @param results  Decisions from deduplicateMemories().
   * @param fileDir  Base directory for writing memory files (create decision).
   */
  apply(results: DedupResult[], fileDir?: string): Promise<void> | void;

  /**
   * Keyword search. Returns L0 fields only — no raw_detail.
   * @param query     Search term (case-insensitive substring).
   * @param category  Optional category filter.
   * @param limit     Max results. Defaults to 20.
   */
  find(query: string, category?: MemoryCategory, limit?: number): Promise<Memory[]> | Memory[];

  /**
   * List all memories sorted by category + slug. Returns L0 fields only.
   * @param category  Optional category filter.
   */
  overview(category?: MemoryCategory): Promise<Memory[]> | Memory[];

  /**
   * Load the full L2 content of a single memory.
   * This is the ONLY method that returns raw content.
   * @param filePathOrId  Absolute file path or numeric memory ID (as string).
   */
  read(filePathOrId: string): Promise<string> | string;

  /**
   * Return a single Memory record by numeric ID (L0 fields only).
   * Returns undefined if not found.
   */
  getById(id: number): Promise<Memory | undefined> | Memory | undefined;

  /** Release any resources held by the backend (e.g. close DB connections). */
  close(): void;
}
