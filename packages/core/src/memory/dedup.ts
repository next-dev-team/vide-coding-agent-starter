import type {
  Memory,
  MemoryCandidate,
  DedupResult,
  DedupDecision,
  DedupeReport,
} from "./types.js";

// ─── Levenshtein (inline, no dep) ─────────────────────────────

/**
 * Compute the Levenshtein edit distance between two strings.
 * O(n*m) time, O(m) space.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr: number[] = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    prev.splice(0, prev.length, ...curr);
  }

  return prev[b.length];
}

/**
 * Normalised Levenshtein similarity in [0, 1].
 * 1.0 = identical, 0.0 = completely different.
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

// ─── Dedup decision logic ─────────────────────────────────────

const DEFAULT_THRESHOLD = 0.85;

/**
 * Compare a single MemoryCandidate against a list of existing Memory records.
 * Returns the DedupResult without writing anything to disk.
 *
 * Decision matrix:
 * - similarity >= threshold  →  skip (near-duplicate)
 * - 0.6 <= sim < threshold   →  merge (overlapping but adds detail)
 * - sim < 0.6 AND category match exists  →  create
 * - no existing at all       →  create
 */
function decideSingle(
  candidate: MemoryCandidate,
  existing: Memory[],
  threshold: number,
): DedupResult {
  if (existing.length === 0) {
    return { decision: "create", candidate, similarity: 0 };
  }

  let bestSim = 0;
  let bestMatch: Memory | undefined;

  for (const mem of existing) {
    const sim = similarity(candidate.l0_abstract, mem.l0_abstract);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = mem;
    }
  }

  let decision: DedupDecision;
  if (bestSim >= threshold) {
    decision = "skip";
  } else if (bestSim >= 0.6) {
    decision = "merge";
  } else {
    decision = "create";
  }

  return {
    decision,
    candidate,
    matchedId: bestMatch?.id,
    similarity: bestSim,
  };
}

/**
 * Deduplicate a batch of MemoryCandidates against existing Memory records.
 * Returns one DedupResult per candidate. No file I/O — pure computation.
 *
 * @param candidates  Candidates from the extractor.
 * @param existing    Current Memory records from the store (L0 fields only).
 * @param threshold   Similarity threshold for "skip" decisions. Defaults to 0.85.
 */
export function deduplicateMemories(
  candidates: MemoryCandidate[],
  existing: Memory[],
  threshold = DEFAULT_THRESHOLD,
): DedupResult[] {
  return candidates.map((c) => decideSingle(c, existing, threshold));
}

// ─── Full-store pairwise sweep (Task 0009) ─────────────────────

/**
 * Run a pairwise dedup sweep across all existing memories within each category.
 * Used by the on-demand `memory_dedupe` MCP tool.
 *
 * Returns a DedupeReport: which pairs to merge, which to delete, and unchanged count.
 * No writes are performed — caller decides based on the report.
 *
 * @param memories  All Memory records from the store (L0 fields only).
 * @param threshold Similarity threshold. Defaults to 0.85.
 */
export function sweepDuplicates(
  memories: Memory[],
  threshold = DEFAULT_THRESHOLD,
): DedupeReport {
  const toMerge: DedupeReport["toMerge"] = [];
  const toDeleteSet = new Set<number>();
  let unchanged = 0;

  // Group by category for efficiency
  const byCategory = new Map<string, Memory[]>();
  for (const m of memories) {
    const group = byCategory.get(m.category) ?? [];
    group.push(m);
    byCategory.set(m.category, group);
  }

  for (const group of byCategory.values()) {
    const processed = new Set<number>();
    for (let i = 0; i < group.length; i++) {
      if (processed.has(group[i].id)) continue;
      let matched = false;

      for (let j = i + 1; j < group.length; j++) {
        if (processed.has(group[j].id)) continue;
        const sim = similarity(group[i].l0_abstract, group[j].l0_abstract);

        if (sim >= threshold) {
          // Keep the older entry (lower id), mark newer as toDelete
          const [keep, remove] =
            group[i].id < group[j].id
              ? [group[i], group[j]]
              : [group[j], group[i]];

          toMerge.push({ sourceId: remove.id, targetId: keep.id, similarity: sim });
          toDeleteSet.add(remove.id);
          processed.add(remove.id);
          matched = true;
        }
      }

      if (!matched) unchanged++;
      processed.add(group[i].id);
    }
  }

  return {
    toMerge,
    toDelete: [...toDeleteSet],
    unchanged,
  };
}
