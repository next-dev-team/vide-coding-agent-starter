// ─── Memory Category ───────────────────────────────────────────

/** The eight OpenViking-aligned memory categories. */
export type MemoryCategory =
  | "tech_stack"
  | "architecture"
  | "workflow"
  | "code_style"
  | "domain"
  | "bugs"
  | "performance"
  | "security";

/** All valid memory categories. */
export const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  "tech_stack",
  "architecture",
  "workflow",
  "code_style",
  "domain",
  "bugs",
  "performance",
  "security",
] as const;

// ─── Memory (stored record) ────────────────────────────────────

/**
 * A persisted memory record in the store (L0 fields only — no raw_detail).
 * Raw detail lives on disk at file_path and is only loaded on explicit request.
 */
export interface Memory {
  /** Auto-assigned integer ID. */
  id: number;
  /** Memory category. */
  category: MemoryCategory;
  /** Kebab-case slug derived from the l0_abstract. */
  slug: string;
  /** One-sentence L0 abstract — the only field returned by find/overview. */
  l0_abstract: string;
  /** Absolute path to the full-content file on disk. */
  file_path: string;
  /** Estimated token count for the full L2 content (char_count / 4). */
  token_count: number;
  /** ISO creation timestamp. */
  created_at: string;
  /** ISO last-update timestamp. */
  updated_at: string;
}

// ─── Memory Candidate (pre-storage) ───────────────────────────

/**
 * A candidate memory extracted from a task file, before dedup decisions are made.
 */
export interface MemoryCandidate {
  /** Proposed category. */
  category: MemoryCategory;
  /** One-sentence L0 abstract. */
  l0_abstract: string;
  /** Full explanation / context to be written to the file. */
  raw_detail: string;
}

// ─── Dedup Decision ────────────────────────────────────────────

/** The four possible dedup outcomes. */
export type DedupDecision = "skip" | "create" | "merge" | "delete";

/**
 * The result of comparing one MemoryCandidate against existing Memory records.
 * No files are written by the dedup engine — this is pure data.
 */
export interface DedupResult {
  /** What action should be taken. */
  decision: DedupDecision;
  /** The incoming candidate. */
  candidate: MemoryCandidate;
  /**
   * The existing Memory ID this candidate matched against (for merge/delete).
   * Undefined for create/skip with no match.
   */
  matchedId?: number;
  /** Similarity score [0,1] that triggered this decision. */
  similarity: number;
}

// ─── Session Tracker ───────────────────────────────────────────

/**
 * A single entry in the in-memory session tracker.
 * Records each memory file accessed and at which tier it was loaded.
 */
export interface SessionEntry {
  /** Absolute path of the memory file. */
  filePath: string;
  /** Which tier was actually loaded. */
  tierLoaded: "L0" | "L1" | "L2";
  /** Tokens consumed at the loaded tier. */
  tokensUsed: number;
  /** Full token count for L2 comparison (from memory_files.token_count). */
  fullTokenCount: number;
  /** ISO timestamp of the access. */
  loadedAt: string;
}

// ─── Dedupe Report ─────────────────────────────────────────────

/**
 * Summary returned by the on-demand full-store dedup sweep (Task 0009).
 */
export interface DedupeReport {
  /** Pairs of memory IDs that should be merged. */
  toMerge: Array<{ sourceId: number; targetId: number; similarity: number }>;
  /** Memory IDs that should be deleted (superseded). */
  toDelete: number[];
  /** Count of memories left unchanged. */
  unchanged: number;
}
