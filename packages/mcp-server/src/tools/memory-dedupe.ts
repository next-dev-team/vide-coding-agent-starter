import { join } from "node:path";
import { createMemoryBackend, sweepDuplicates } from "@agent-kanban/core";
import type { MemoryCategory, DedupeReport } from "@agent-kanban/core";

/** Tool definition for agent-kanban_memory_dedupe. */
export const memoryDedupeTool = {
  name: "memory_dedupe",
  description:
    "On-demand full-store deduplication sweep. Scans all memories (or a single category) for near-duplicates and returns a DedupeReport. No writes unless dry_run is false and the caller confirms.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      category: {
        type: "string",
        enum: ["tech_stack","architecture","workflow","code_style","domain","bugs","performance","security"],
        description: "Optional: limit sweep to one category.",
      },
      dry_run: {
        type: "boolean",
        description: "If false, apply the merge/delete decisions immediately. Defaults to true.",
      },
      threshold: {
        type: "number",
        description: "Similarity threshold [0,1] for duplicate detection. Defaults to 0.85.",
      },
    },
  },
};

/** Handle the memory_dedupe tool call. */
export async function handleMemoryDedupe(args: Record<string, unknown>): Promise<unknown> {
  const projectPath = (args.project_path as string) || process.cwd();
  const category = args.category as MemoryCategory | undefined;
  const dryRun = args.dry_run !== false; // default true
  const threshold = typeof args.threshold === "number" ? args.threshold : 0.85;

  const store = createMemoryBackend(projectPath);

  try {
    const memories = await Promise.resolve(store.overview(category));
    const report: DedupeReport = sweepDuplicates(memories, threshold);

    if (!dryRun && (report.toMerge.length > 0 || report.toDelete.length > 0)) {
      // Build DedupResults from the report to call store.apply()
      // For merge pairs: create a "merge" decision for the source
      const mergeResults = report.toMerge.map((pair) => {
        const source = memories.find((m) => m.id === pair.sourceId);
        const target = memories.find((m) => m.id === pair.targetId);
        if (!source || !target) return null;
        return {
          decision: "merge" as const,
          candidate: {
            category: source.category,
            l0_abstract: target.l0_abstract, // keep target's abstract
            raw_detail: target.l0_abstract,
          },
          matchedId: pair.targetId,
          similarity: pair.similarity,
        };
      }).filter(Boolean);

      // For deletes
      const deleteResults = report.toDelete.map((id) => {
        const mem = memories.find((m) => m.id === id);
        if (!mem) return null;
        return {
          decision: "delete" as const,
          candidate: {
            category: mem.category,
            l0_abstract: mem.l0_abstract,
            raw_detail: mem.l0_abstract,
          },
          matchedId: id,
          similarity: 1,
        };
      }).filter(Boolean);

      const fileDir = join(projectPath, ".agent-kanban", "memories");
      await Promise.resolve(
        store.apply(
          [...mergeResults, ...deleteResults] as Parameters<typeof store.apply>[0],
          fileDir,
        ),
      );
    }

    return {
      dry_run: dryRun,
      threshold,
      category: category ?? "all",
      report,
      applied: !dryRun,
    };
  } finally {
    store.close();
  }
}
