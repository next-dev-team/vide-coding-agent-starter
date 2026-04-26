import type { MemoryCandidate, MemoryCategory } from "./types.js";
import { MEMORY_CATEGORIES } from "./types.js";

// ─── Category keyword map ─────────────────────────────────────

/**
 * Keyword → category lookup table.
 * Words are matched case-insensitively against each bullet text.
 * The first category whose keywords appear wins; fallback = "architecture".
 */
const CATEGORY_KEYWORDS: Record<MemoryCategory, readonly string[]> = {
  tech_stack: [
    "typescript", "javascript", "node", "react", "vite", "pnpm", "esbuild",
    "vitest", "mcp", "sqlite", "library", "package", "dependency", "runtime",
    "framework", "sdk",
  ],
  architecture: [
    "pattern", "module", "interface", "abstraction", "boundary", "design",
    "structure", "layer", "separation", "coupling", "cohesion", "adr",
    "decision", "schema", "type", "shape", "contract",
  ],
  workflow: [
    "workflow", "process", "branch", "pr", "pull request", "review", "ci",
    "deploy", "release", "git", "commit", "merge", "task", "kanban",
    "ticket", "standup", "sprint", "loop", "pipeline",
  ],
  code_style: [
    "naming", "convention", "format", "style", "eslint", "lint", "prettier",
    "indent", "case", "camelCase", "kebab", "pascal", "snake", "const",
    "function", "class", "comment", "jsdoc",
  ],
  domain: [
    "business", "rule", "domain", "entity", "model", "aggregate", "event",
    "command", "policy", "invariant", "requirement", "user story", "feature",
  ],
  bugs: [
    "bug", "fix", "error", "issue", "crash", "regression", "workaround",
    "root cause", "failure", "unexpected", "broken", "patch",
  ],
  performance: [
    "performance", "latency", "throughput", "cache", "token", "memory",
    "slow", "fast", "optimize", "benchmark", "n+1", "query", "batch",
  ],
  security: [
    "security", "auth", "authentication", "authorization", "permission",
    "secret", "key", "owasp", "vulnerability", "inject", "xss", "csrf",
    "sanitize", "validate", "encrypt",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────

/** Classify a single text string into one of the 8 memory categories. */
function classify(text: string): MemoryCategory {
  const lower = text.toLowerCase();
  let bestCategory: MemoryCategory = "architecture";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [MemoryCategory, readonly string[]]
  >) {
    const score = keywords.reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

/** Extract bullet-point text from a markdown section. */
function extractBullets(section: string): string[] {
  return section
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter((l) => l.length > 10); // skip very short bullets
}

/** Convert a text string to a kebab-case slug (max 60 chars). */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Extract a named markdown section's content. */
function extractSection(markdown: string, heading: string): string {
  const re = new RegExp(`##\\s+${heading}\\s*\n([\\s\\S]*?)(?=\n##|$)`, "i");
  const m = markdown.match(re);
  return m ? m[1].trim() : "";
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Parse a completed task markdown file and extract reusable memory candidates.
 * Sources the `## Notes`, `## Approach`, and `## Open Questions` sections.
 * Returns an array of classified, deduplicated candidates (by l0_abstract).
 */
export function extractMemories(taskMarkdown: string): MemoryCandidate[] {
  const sections = ["Notes", "Approach", "Open Questions"];
  const seen = new Set<string>();
  const candidates: MemoryCandidate[] = [];

  for (const section of sections) {
    const content = extractSection(taskMarkdown, section);
    if (!content) continue;

    const bullets = extractBullets(content);
    for (const bullet of bullets) {
      // Skip placeholder text
      if (
        bullet.startsWith("(") ||
        bullet === "TBD" ||
        bullet === "empty until implementation"
      )
        continue;

      const abstract = bullet.slice(0, 140); // cap L0 at 140 chars
      if (seen.has(abstract)) continue;
      seen.add(abstract);

      candidates.push({
        category: classify(bullet),
        l0_abstract: abstract,
        raw_detail: bullet,
      });
    }
  }

  return candidates;
}

// Re-export for convenience
export { MEMORY_CATEGORIES };
export type { MemoryCandidate, MemoryCategory };
