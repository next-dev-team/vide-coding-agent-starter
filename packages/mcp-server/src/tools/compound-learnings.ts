import { scanTasks } from "@agent-kanban/core";
import { extractMemories, deduplicateMemories, createMemoryBackend } from "@agent-kanban/core";

/** Tool definition for agent-kanban_compound_learnings. */
export const compoundLearningsTool = {
  name: "compound_learnings",
  description:
    "Extract reusable memory candidates from a completed task file and return dedup decisions (skip/create/merge/delete). No files are written — the caller decides what to persist.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: {
        type: "string",
        description: "Project root path. Defaults to cwd.",
      },
      task_id: {
        type: "string",
        description: "Task ID to extract learnings from, e.g. '0002'.",
      },
    },
    required: ["task_id"],
  },
};

/** Handle the compound_learnings tool call. */
export async function handleCompoundLearnings(
  args: Record<string, unknown>,
): Promise<unknown> {
  const projectPath = (args.project_path as string) || process.cwd();
  const taskId = args.task_id as string;

  // 1. Find and read the task markdown
  const tasks = await scanTasks(projectPath);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  // 2. Extract memory candidates from the task
  const candidates = extractMemories(task.raw);
  if (candidates.length === 0) {
    return { task_id: taskId, candidates: [], results: [], message: "No extractable memories found." };
  }

  // 3. Load existing memories for dedup comparison
  let existing: Awaited<ReturnType<ReturnType<typeof createMemoryBackend>["overview"]>> = [];
  try {
    const store = createMemoryBackend(projectPath);
    existing = await Promise.resolve(store.overview());
    store.close();
  } catch {
    // Backend not yet initialised — first run, no existing memories
  }

  // 4. Run dedup
  const results = deduplicateMemories(candidates, existing);

  return {
    task_id: taskId,
    candidates_found: candidates.length,
    results,
  };
}
