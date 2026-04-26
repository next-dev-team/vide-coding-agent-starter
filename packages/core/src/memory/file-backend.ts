import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { join, basename } from "node:path";
import type { Memory, MemoryCategory, DedupResult } from "./types.js";
import type { IMemoryBackend } from "./backend.js";

// ─── Inline frontmatter parser/serialiser ────────────────────────────────────
// Avoids a gray-matter dependency (~40 LoC). Handles only the subset we write.

interface Frontmatter {
  id: number;
  category: string;
  slug: string;
  abstract: string;
  token_count: number;
  created_at: string;
  updated_at: string;
}

function parseFrontmatter(content: string): { fm: Frontmatter; body: string } | null {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const yamlBlock = content.slice(4, end);
  const body = content.slice(end + 5);
  const fm: Partial<Frontmatter> = {};
  for (const line of yamlBlock.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^"(.*)"$/, "$1");
    switch (key) {
      case "id":           fm.id = Number(val); break;
      case "category":     fm.category = val; break;
      case "slug":         fm.slug = val; break;
      case "abstract":     fm.abstract = val; break;
      case "token_count":  fm.token_count = Number(val); break;
      case "created_at":   fm.created_at = val; break;
      case "updated_at":   fm.updated_at = val; break;
    }
  }
  if (!fm.category || !fm.slug || !fm.abstract) return null;
  return { fm: fm as Frontmatter, body };
}

function serialiseFrontmatter(fm: Frontmatter, body: string): string {
  return [
    "---",
    `id: ${fm.id}`,
    `category: ${fm.category}`,
    `slug: ${fm.slug}`,
    `abstract: "${fm.abstract.replace(/"/g, '\\"')}"`,
    `token_count: ${fm.token_count}`,
    `created_at: ${fm.created_at}`,
    `updated_at: ${fm.updated_at}`,
    "---",
    "",
    body.trimStart(),
  ].join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Walk docs/memory/<category>/ and return all parsed entries. */
function loadAllEntries(
  memoryDir: string,
  category?: MemoryCategory,
): Array<{ fm: Frontmatter; filePath: string }> {
  if (!existsSync(memoryDir)) return [];

  const categories = category
    ? [category]
    : (readdirSync(memoryDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name) as MemoryCategory[]);

  const results: Array<{ fm: Frontmatter; filePath: string }> = [];
  for (const cat of categories) {
    const catDir = join(memoryDir, cat);
    if (!existsSync(catDir)) continue;
    const files = readdirSync(catDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const filePath = join(catDir, file);
      const content = readFileSync(filePath, "utf-8");
      const parsed = parseFrontmatter(content);
      if (parsed) results.push({ fm: parsed.fm, filePath });
    }
  }
  return results;
}

/** Assign a stable numeric ID from slug+category hash (deterministic). */
function stableId(category: string, slug: string): number {
  // Simple djb2-style hash — stable across runs
  const str = `${category}:${slug}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

// ─── MemoryFileBackend ────────────────────────────────────────────────────────

/**
 * File-mode memory backend. Stores each memory as a standalone Markdown file
 * with YAML frontmatter under `docs/memory/<category>/<slug>.md`.
 * All methods are synchronous — no SQLite dependency required.
 */
export class MemoryFileBackend implements IMemoryBackend {
  private readonly memoryDir: string;

  /** @param projectPath Root of the project (where docs/ lives). */
  constructor(projectPath: string) {
    this.memoryDir = join(projectPath, "docs", "memory");
  }

  /**
   * Apply DedupResults to the file store.
   * - create: write a new .md file.
   * - merge:  rewrite the matched file with the new abstract.
   * - delete: remove the matched file.
   * - skip:   no-op.
   */
  apply(results: DedupResult[]): void {
    for (const r of results) {
      const slug = slugify(r.candidate.l0_abstract);
      const catDir = join(this.memoryDir, r.candidate.category);
      const filePath = join(catDir, `${slug}.md`);
      const ts = now();

      switch (r.decision) {
        case "create": {
          mkdirSync(catDir, { recursive: true });
          const fm: Frontmatter = {
            id: stableId(r.candidate.category, slug),
            category: r.candidate.category,
            slug,
            abstract: r.candidate.l0_abstract,
            token_count: estimateTokens(r.candidate.raw_detail),
            created_at: ts,
            updated_at: ts,
          };
          writeFileSync(filePath, serialiseFrontmatter(fm, r.candidate.raw_detail), "utf-8");
          break;
        }

        case "merge": {
          // Find file by matchedId — scan for matching id in frontmatter
          if (r.matchedId == null) break;
          const entries = loadAllEntries(this.memoryDir, r.candidate.category);
          const match = entries.find((e) => e.fm.id === r.matchedId);
          if (!match) break;
          const updatedFm: Frontmatter = {
            ...match.fm,
            abstract: r.candidate.l0_abstract,
            token_count: estimateTokens(r.candidate.raw_detail),
            updated_at: ts,
          };
          writeFileSync(match.filePath, serialiseFrontmatter(updatedFm, r.candidate.raw_detail), "utf-8");
          break;
        }

        case "delete": {
          if (r.matchedId == null) break;
          const entries = loadAllEntries(this.memoryDir, r.candidate.category);
          const match = entries.find((e) => e.fm.id === r.matchedId);
          if (match && existsSync(match.filePath)) {
            unlinkSync(match.filePath);
          }
          break;
        }

        case "skip":
          break;
      }
    }
  }

  /**
   * Keyword search on the abstract field (case-insensitive substring).
   * Returns L0 fields only — no body content.
   */
  find(query: string, category?: MemoryCategory, limit = 20): Memory[] {
    const q = query.toLowerCase();
    const entries = loadAllEntries(this.memoryDir, category);
    return entries
      .filter((e) => e.fm.abstract.toLowerCase().includes(q))
      .slice(0, limit)
      .map((e) => this._toMemory(e.fm, e.filePath));
  }

  /**
   * List all memories sorted by category + slug. Returns L0 fields only.
   */
  overview(category?: MemoryCategory): Memory[] {
    const entries = loadAllEntries(this.memoryDir, category);
    entries.sort((a, b) =>
      a.fm.category.localeCompare(b.fm.category) || a.fm.slug.localeCompare(b.fm.slug),
    );
    return entries.map((e) => this._toMemory(e.fm, e.filePath));
  }

  /**
   * Load the full L2 file content for a single memory.
   * Accepts absolute file path or numeric memory ID (as string).
   */
  read(filePathOrId: string): string {
    const asNum = Number(filePathOrId);
    if (!Number.isNaN(asNum)) {
      const entries = loadAllEntries(this.memoryDir);
      const match = entries.find((e) => e.fm.id === asNum);
      if (!match) throw new Error(`Memory with id=${asNum} not found`);
      return readFileSync(match.filePath, "utf-8");
    }
    return readFileSync(filePathOrId, "utf-8");
  }

  /**
   * Return a single Memory record by numeric ID (L0 fields only).
   */
  getById(id: number): Memory | undefined {
    const entries = loadAllEntries(this.memoryDir);
    const match = entries.find((e) => e.fm.id === id);
    return match ? this._toMemory(match.fm, match.filePath) : undefined;
  }

  /** No-op — file backend holds no persistent connections. */
  close(): void {}

  private _toMemory(fm: Frontmatter, filePath: string): Memory {
    return {
      id: fm.id,
      category: fm.category as MemoryCategory,
      slug: fm.slug,
      l0_abstract: fm.abstract,
      file_path: filePath,
      token_count: fm.token_count,
      created_at: fm.created_at,
      updated_at: fm.updated_at,
    };
  }

  /** Expose the base memory directory for testing. */
  get baseDir(): string {
    return this.memoryDir;
  }
}
