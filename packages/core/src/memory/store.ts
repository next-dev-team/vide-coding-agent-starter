import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type {
  Memory,
  MemoryCategory,
  DedupResult,
} from "./types.js";
import type { IMemoryBackend } from "./backend.js";

// ─── Schema ───────────────────────────────────────────────────

const DDL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS memory_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT    NOT NULL,
  slug        TEXT    NOT NULL,
  l0_abstract TEXT    NOT NULL,
  file_path   TEXT    NOT NULL UNIQUE,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts
  USING fts5(l0_abstract, content='memory_files', content_rowid='id');

CREATE TRIGGER IF NOT EXISTS memory_files_ai
  AFTER INSERT ON memory_files BEGIN
    INSERT INTO memory_fts(rowid, l0_abstract) VALUES (new.id, new.l0_abstract);
  END;

CREATE TRIGGER IF NOT EXISTS memory_files_ad
  AFTER DELETE ON memory_files BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, l0_abstract)
      VALUES ('delete', old.id, old.l0_abstract);
  END;

CREATE TRIGGER IF NOT EXISTS memory_files_au
  AFTER UPDATE OF l0_abstract ON memory_files BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, l0_abstract)
      VALUES ('delete', old.id, old.l0_abstract);
    INSERT INTO memory_fts(rowid, l0_abstract) VALUES (new.id, new.l0_abstract);
  END;

CREATE TABLE IF NOT EXISTS memory_dedup (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id   INTEGER NOT NULL REFERENCES memory_files(id) ON DELETE CASCADE,
  candidate_hash TEXT NOT NULL,
  decision    TEXT    NOT NULL,
  decided_at  TEXT    NOT NULL
);
`;

// ─── L0 columns ───────────────────────────────────────────────

/** The L0-only column list — never include raw_detail in queries. */
const L0_COLS =
  "id, category, slug, l0_abstract, file_path, token_count, created_at, updated_at";

// ─── Helpers ─────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
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

// ─── MemoryStore ─────────────────────────────────────────────

/**
 * SQLite-backed store for memory records.
 * Enforces the L0/L1/L2 tier discipline:
 *   - find() and overview() return L0 fields only.
 *   - read() returns L2 full content for a single explicit path.
 */
export class MemoryStore implements IMemoryBackend {
  private db: Database.Database;

  /**
   * Open (or create) the memory store at the given dbPath.
   * Creates parent directories if needed.
   */
  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(DDL);
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }

  /**
   * Apply a batch of DedupResults to the store.
   * - create: insert a new memory_files row.
   * - merge:  update l0_abstract and token_count of the matched record.
   * - delete: remove the matched record.
   * - skip:   no-op.
   * All mutations run inside a single transaction.
   */
  apply(results: DedupResult[], fileDir = ".agent-kanban/memory"): void {
    const insertStmt = this.db.prepare(`
      INSERT INTO memory_files (category, slug, l0_abstract, file_path, token_count, created_at, updated_at)
      VALUES (@category, @slug, @l0_abstract, @file_path, @token_count, @created_at, @updated_at)
    `);

    const updateStmt = this.db.prepare(`
      UPDATE memory_files
         SET l0_abstract = @l0_abstract,
             token_count = @token_count,
             updated_at  = @updated_at
       WHERE id = @id
    `);

    const deleteStmt = this.db.prepare(`
      DELETE FROM memory_files WHERE id = @id
    `);

    const tx = this.db.transaction(() => {
      for (const r of results) {
        const ts = now();
        const slug = slugify(r.candidate.l0_abstract);
        const filePath = join(fileDir, `${slug}.md`);
        const tokenCount = estimateTokens(r.candidate.raw_detail);

        switch (r.decision) {
          case "create":
            insertStmt.run({
              category: r.candidate.category,
              slug,
              l0_abstract: r.candidate.l0_abstract,
              file_path: filePath,
              token_count: tokenCount,
              created_at: ts,
              updated_at: ts,
            });
            break;

          case "merge":
            if (r.matchedId != null) {
              updateStmt.run({
                id: r.matchedId,
                l0_abstract: r.candidate.l0_abstract,
                token_count: tokenCount,
                updated_at: ts,
              });
            }
            break;

          case "delete":
            if (r.matchedId != null) {
              deleteStmt.run({ id: r.matchedId });
            }
            break;

          case "skip":
            break;
        }
      }
    });

    tx();
  }

  /**
   * Full-text search memories. Returns L0 fields only — no raw_detail.
   *
   * @param query     FTS5 query string.
   * @param category  Optional category filter.
   * @param limit     Max results. Defaults to 20.
   */
  find(query: string, category?: MemoryCategory, limit = 20): Memory[] {
    if (category) {
      return this.db
        .prepare(
          `SELECT m.${L0_COLS}
             FROM memory_fts
             JOIN memory_files m ON memory_fts.rowid = m.id
            WHERE memory_fts MATCH ?
              AND m.category = ?
            LIMIT ?`,
        )
        .all(query, category, limit) as Memory[];
    }

    return this.db
      .prepare(
        `SELECT m.${L0_COLS}
           FROM memory_fts
           JOIN memory_files m ON memory_fts.rowid = m.id
          WHERE memory_fts MATCH ?
          LIMIT ?`,
      )
      .all(query, limit) as Memory[];
  }

  /**
   * List all memories, sorted by category then slug. Returns L0 fields only.
   *
   * @param category  Optional category filter.
   */
  overview(category?: MemoryCategory): Memory[] {
    if (category) {
      return this.db
        .prepare(
          `SELECT ${L0_COLS} FROM memory_files WHERE category = ? ORDER BY category, slug`,
        )
        .all(category) as Memory[];
    }

    return this.db
      .prepare(`SELECT ${L0_COLS} FROM memory_files ORDER BY category, slug`)
      .all() as Memory[];
  }

  /**
   * Load the full L2 content for a single memory by file path or numeric ID.
   * This is the ONLY method that returns raw content — all others return L0 only.
   *
   * @param filePathOrId  Absolute file path or numeric memory ID (as string).
   */
  read(filePathOrId: string): string {
    // Try numeric ID first
    const asNum = Number(filePathOrId);
    let filePath = filePathOrId;

    if (!Number.isNaN(asNum)) {
      const row = this.db
        .prepare("SELECT file_path FROM memory_files WHERE id = ?")
        .get(asNum) as { file_path: string } | undefined;
      if (!row) throw new Error(`Memory with id=${asNum} not found`);
      filePath = row.file_path;
    }

    return readFileSync(filePath, "utf-8");
  }

  /**
   * Return a single Memory record by ID (L0 fields only).
   * Returns undefined if not found.
   */
  getById(id: number): Memory | undefined {
    return this.db
      .prepare(`SELECT ${L0_COLS} FROM memory_files WHERE id = ?`)
      .get(id) as Memory | undefined;
  }
}
