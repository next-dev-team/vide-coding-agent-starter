import type { SessionEntry } from "@agent-kanban/core";

// ─── In-memory session tracker singleton ─────────────────────

/**
 * Tracks which memory files have been accessed this session, at which tier,
 * and how many tokens were used vs. the full L2 cost.
 *
 * This is a process-level singleton — it lives as long as the MCP server process.
 * The VS Code extension polls it via the `memory_session` tool.
 */
const entries = new Map<string, SessionEntry>();

/**
 * Record an L0 or L1 abstract access (no file read, only abstract in DB).
 */
export function trackAbstractAccess(
  filePath: string,
  tierLoaded: "L0" | "L1",
  abstractTokens: number,
  fullTokenCount: number,
): void {
  entries.set(filePath, {
    filePath,
    tierLoaded,
    tokensUsed: abstractTokens,
    fullTokenCount,
    loadedAt: new Date().toISOString(),
  });
}

/**
 * Record an L2 full-content read.
 */
export function trackL2Read(
  filePath: string,
  content: string,
): void {
  const tokenCount = Math.ceil(content.length / 4);
  entries.set(filePath, {
    filePath,
    tierLoaded: "L2",
    tokensUsed: tokenCount,
    fullTokenCount: tokenCount,
    loadedAt: new Date().toISOString(),
  });
}

/**
 * Return a snapshot of all session entries.
 * Called by the `memory_session` MCP tool.
 */
export function getSnapshot(): SessionEntry[] {
  return [...entries.values()];
}

/**
 * Reset all session tracking data.
 * Called by the "Clear Session" button in the VS Code Memory Monitor.
 */
export function clearSession(): void {
  entries.clear();
}
