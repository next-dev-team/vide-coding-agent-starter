import type { AcceptanceCriterion } from "./types.js";

// ─── Helpers ───────────────────────────────────────────────────

/** Zero-pad an ID number to 4 digits. */
export function padId(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * Sanitize a user-provided string into a safe kebab-case slug.
 * Lowercases, strips non-alphanum, collapses dashes, caps at 60 chars.
 */
export function sanitizeSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "untitled";
}

/** Format today's date as YYYY-MM-DD. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Render a checkbox list. */
function renderCheckboxes(items: AcceptanceCriterion[]): string {
  return items
    .map((c) => `- [${c.checked ? "x" : " "}] ${c.text}`)
    .join("\n");
}

/** Render a bullet list. */
function renderBullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

// ─── Task Writer ───────────────────────────────────────────────

/** Options for generating a new task markdown file. */
export interface TaskWriteOptions {
  /** Task ID string, e.g. "0001" or "0002a". */
  id: string;
  /** Short description for the title. */
  title: string;
  /** PRD reference path, e.g. "docs/prd/0001-add-todo.md". */
  prdRef?: string;
  /** One-sentence goal. */
  goal: string;
  /** Testable acceptance criteria. */
  acceptance?: AcceptanceCriterion[];
  /** Files likely affected (as strings like "src/foo.ts — new"). */
  filesAffected?: string[];
  /** Approach bullets (3-5). */
  approach?: string[];
  /** Open questions. */
  openQuestions?: string[];
}

/** Generate task markdown content from structured options. */
export function writeTask(opts: TaskWriteOptions): string {
  const acceptance = opts.acceptance ?? [
    { checked: false, text: "All tests pass" },
    { checked: false, text: "No lint/type errors" },
    { checked: false, text: "Public APIs are documented" },
  ];

  const files = opts.filesAffected ?? [];
  const approach = opts.approach ?? [];
  const questions = opts.openQuestions ?? [];

  return `# Task ${opts.id}: ${opts.title}

> PRD: \`${opts.prdRef ?? "(none)"}\`
> Created: ${today()}

## Goal

${opts.goal}

## Acceptance Criteria

${renderCheckboxes(acceptance)}

## Files Likely Affected

${files.length > 0 ? renderBullets(files) : "(TBD)"}

## Approach

${approach.length > 0 ? renderBullets(approach) : "(TBD)"}

## Open Questions

${questions.length > 0 ? renderBullets(questions) : "(none)"}

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from \`wip-\` to \`done-\`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
`;
}

/** Generate the filename for a new task. */
export function taskFilename(
  id: string,
  slug: string,
  status: string = "todo",
): string {
  return `${status}-${id}-${sanitizeSlug(slug)}.md`;
}

// ─── PRD Writer ────────────────────────────────────────────────

/** Options for generating a new PRD markdown file. */
export interface PrdWriteOptions {
  /** PRD ID string, e.g. "0001". */
  id: string;
  /** Feature title. */
  title: string;
  /** Owner name. */
  owner?: string;
  /** Problem statement. */
  problem: string;
  /** Target users description. */
  users?: string;
  /** User stories as "As a X, I want Y, so that Z" strings. */
  userStories?: string[];
  /** Testable acceptance criteria. */
  acceptance?: AcceptanceCriterion[];
  /** Out of scope items. */
  outOfScope?: string[];
  /** Open questions. */
  openQuestions?: string[];
}

/** Generate PRD markdown content from structured options. */
export function writePrd(opts: PrdWriteOptions): string {
  const acceptance = opts.acceptance ?? [];
  const stories = opts.userStories ?? [];
  const outOfScope = opts.outOfScope ?? [];
  const questions = opts.openQuestions ?? [];

  return `# PRD-${opts.id}: ${opts.title}

> Status: draft
> Owner: ${opts.owner ?? "(TBD)"}
> Created: ${today()}

## Problem

${opts.problem}

## Users

${opts.users ?? "(TBD)"}

## User Stories

${stories.length > 0 ? renderBullets(stories) : "- As a **user**, I want to **...**,  so that **...**."}

## Acceptance Criteria

${acceptance.length > 0 ? renderCheckboxes(acceptance) : "- [ ] (TBD)"}

## Out of Scope

${outOfScope.length > 0 ? renderBullets(outOfScope) : "- (TBD)"}

## Open Questions

${questions.length > 0 ? renderBullets(questions) : "- (none)"}

## References

- Linked tasks: \`docs/tasks/todo-${opts.id}-...\`
- Related ADRs: (none yet)

---

**Tasks generated from this PRD:**
- [ ] \`docs/tasks/todo-${opts.id}-...\`
`;
}

/** Generate the filename for a new PRD. */
export function prdFilename(id: string, slug: string): string {
  return `${id}-${sanitizeSlug(slug)}.md`;
}

// ─── ADR Writer ────────────────────────────────────────────────

/** Options for generating a new ADR markdown file. */
export interface AdrWriteOptions {
  /** ADR ID string, e.g. "0001". */
  id: string;
  /** Decision title. */
  title: string;
  /** Deciders. */
  deciders?: string;
  /** Context paragraph. */
  context: string;
  /** Decision paragraph. */
  decision: string;
  /** Positive consequences. */
  positive?: string[];
  /** Negative / trade-off consequences. */
  negative?: string[];
}

/** Generate ADR markdown content from structured options. */
export function writeAdr(opts: AdrWriteOptions): string {
  const positive = opts.positive ?? [];
  const negative = opts.negative ?? [];

  return `# ADR-${opts.id}: ${opts.title}

> Status: proposed
> Date: ${today()}
> Deciders: ${opts.deciders ?? "(TBD)"}

## Context

${opts.context}

## Decision

${opts.decision}

## Consequences

### Positive
${positive.length > 0 ? renderBullets(positive) : "- (TBD)"}

### Negative / Trade-offs
${negative.length > 0 ? renderBullets(negative) : "- (TBD)"}

### Neutral
- (TBD)

## Alternatives Considered

(TBD)

## References

- PRDs: (link)
- External: (link)
`;
}

/** Generate the filename for a new ADR. */
export function adrFilename(id: string, slug: string): string {
  return `${id}-${sanitizeSlug(slug)}.md`;
}
