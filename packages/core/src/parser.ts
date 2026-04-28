import { readFile } from "node:fs/promises";
import type {
  AcceptanceCriterion,
  AdrStatus,
  Adr,
  Prd,
  PrdStatus,
  Task,
  TaskStatus,
} from "./types.js";

// ─── Helpers ───────────────────────────────────────────────────

/** Extract the content under a ## heading, stopping at the next ## or EOF. */
function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(
    `^##\\s+${escapeRegex(heading)}\\s*$`,
    "m",
  );
  const match = pattern.exec(markdown);
  if (!match) return "";

  const start = match.index + match[0].length;
  const nextHeading = markdown.indexOf("\n## ", start);
  const end = nextHeading === -1 ? markdown.length : nextHeading;
  return markdown.slice(start, end).trim();
}

/** Parse checkbox lines: `- [x] text` or `- [ ] text`. */
function parseCheckboxes(section: string): AcceptanceCriterion[] {
  const lines = section.split("\n");
  const criteria: AcceptanceCriterion[] = [];
  for (const line of lines) {
    const m = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (m) {
      criteria.push({
        checked: m[1].toLowerCase() === "x",
        text: m[2].trim(),
      });
    }
  }
  return criteria;
}

/** Parse bullet list lines (- item). */
function parseBullets(section: string): string[] {
  return section
    .split("\n")
    .filter((l) => l.match(/^-\s+/))
    .map((l) => l.replace(/^-\s+/, "").trim());
}

/** Extract a blockquote metadata field, e.g. `> PRD: docs/prd/0001.md`. */
function extractBlockquoteField(
  markdown: string,
  field: string,
): string | null {
  const pattern = new RegExp(`^>\\s*${escapeRegex(field)}:\\s*(.+)$`, "mi");
  const m = pattern.exec(markdown);
  return m ? m[1].trim().replace(/^`|`$/g, "") : null;
}

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Task Parser ───────────────────────────────────────────────

/** Filename pattern: {status}-{id}-{slug}.md */
const TASK_FILENAME_RE = /^(todo|wip|verified|done|blocked)-(\w+)-(.+)\.md$/;

/** Parse a task filename into its components. Returns null if invalid. */
export function parseTaskFilename(
  filename: string,
): { status: TaskStatus; id: string; slug: string } | null {
  const m = TASK_FILENAME_RE.exec(filename);
  if (!m) return null;
  return {
    status: m[1] as TaskStatus,
    id: m[2],
    slug: m[3],
  };
}

/** Parse a task markdown file into a structured Task object. */
export function parseTask(filename: string, markdown: string): Task {
  const parsed = parseTaskFilename(filename);
  if (!parsed) {
    throw new Error(`Invalid task filename: ${filename}`);
  }

  const goalSection = extractSection(markdown, "Goal");
  const acceptanceSection = extractSection(markdown, "Acceptance Criteria");
  const filesSection = extractSection(markdown, "Files Likely Affected");
  const approachSection = extractSection(markdown, "Approach");
  const questionsSection = extractSection(markdown, "Open Questions");
  const notesSection = extractSection(markdown, "Notes");

  const rawPrdRef = extractBlockquoteField(markdown, "PRD");
  return {
    id: parsed.id,
    slug: parsed.slug,
    status: parsed.status,
    filename,
    goal: goalSection.split("\n")[0] || "",
    prdRef: rawPrdRef === "(none)" ? null : rawPrdRef,
    created: extractBlockquoteField(markdown, "Created"),
    acceptance: parseCheckboxes(acceptanceSection),
    filesAffected: parseBullets(filesSection),
    approach: parseBullets(approachSection),
    openQuestions: parseBullets(questionsSection),
    notes: parseBullets(notesSection),
    raw: markdown,
  };
}

/** Read and parse a task file from disk. */
export async function parseTaskFile(filePath: string): Promise<Task> {
  const content = await readFile(filePath, "utf-8");
  const filename = filePath.split(/[/\\]/).pop()!;
  return parseTask(filename, content);
}

// ─── PRD Parser ────────────────────────────────────────────────

/** PRD filename pattern: {id}-{slug}.md */
const PRD_FILENAME_RE = /^(\d+)-(.+)\.md$/;

/** Parse a PRD markdown file into a structured Prd object. */
export function parsePrd(filename: string, markdown: string): Prd {
  const m = PRD_FILENAME_RE.exec(filename);
  if (!m) throw new Error(`Invalid PRD filename: ${filename}`);

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const problemSection = extractSection(markdown, "Problem");
  const acceptanceSection = extractSection(markdown, "Acceptance Criteria");

  return {
    id: m[1],
    slug: m[2],
    status: (extractBlockquoteField(markdown, "Status") as PrdStatus) || "draft",
    owner: extractBlockquoteField(markdown, "Owner"),
    created: extractBlockquoteField(markdown, "Created"),
    filename,
    title: titleMatch ? titleMatch[1].trim() : "",
    problem: problemSection,
    acceptance: parseCheckboxes(acceptanceSection),
    raw: markdown,
  };
}

/** Read and parse a PRD file from disk. */
export async function parsePrdFile(filePath: string): Promise<Prd> {
  const content = await readFile(filePath, "utf-8");
  const filename = filePath.split(/[/\\]/).pop()!;
  return parsePrd(filename, content);
}

// ─── ADR Parser ────────────────────────────────────────────────

/** ADR filename pattern: {id}-{slug}.md */
const ADR_FILENAME_RE = /^(\d+)-(.+)\.md$/;

/** Parse an ADR markdown file into a structured Adr object. */
export function parseAdr(filename: string, markdown: string): Adr {
  const m = ADR_FILENAME_RE.exec(filename);
  if (!m) throw new Error(`Invalid ADR filename: ${filename}`);

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const contextSection = extractSection(markdown, "Context");
  const decisionSection = extractSection(markdown, "Decision");

  return {
    id: m[1],
    slug: m[2],
    status: (extractBlockquoteField(markdown, "Status") as AdrStatus) || "proposed",
    date: extractBlockquoteField(markdown, "Date"),
    filename,
    title: titleMatch ? titleMatch[1].trim() : "",
    context: contextSection,
    decision: decisionSection,
    raw: markdown,
  };
}

/** Read and parse an ADR file from disk. */
export async function parseAdrFile(filePath: string): Promise<Adr> {
  const content = await readFile(filePath, "utf-8");
  const filename = filePath.split(/[/\\]/).pop()!;
  return parseAdr(filename, content);
}
