import { getSnapshot, clearSession } from "./session-tracker.js";

/** Tool definition for agent-kanban_memory_session. */
export const memorySessionTool = {
  name: "memory_session",
  description:
    "Return the current session memory access log (which files were loaded, at which tier, and token delta). Used by the VS Code Memory Monitor panel.",
  inputSchema: {
    type: "object" as const,
    properties: {
      clear: {
        type: "boolean",
        description: "If true, clear the session log after returning it.",
      },
    },
  },
};

/** Handle the memory_session tool call. */
export function handleMemorySession(args: Record<string, unknown>): unknown {
  const snapshot = getSnapshot();

  const totalTokensUsed = snapshot.reduce((sum, e) => sum + e.tokensUsed, 0);
  const totalFullTokens = snapshot.reduce((sum, e) => sum + e.fullTokenCount, 0);
  const totalSaved = totalFullTokens - totalTokensUsed;

  if (args.clear === true) {
    clearSession();
  }

  return {
    entries: snapshot,
    summary: {
      filesAccessed: snapshot.length,
      totalTokensUsed,
      totalFullTokens,
      totalTokensSaved: totalSaved,
    },
    cleared: args.clear === true,
  };
}
