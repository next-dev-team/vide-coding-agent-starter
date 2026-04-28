import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

// ─── Types ─────────────────────────────────────────────────────────

/** A single interview question with category. */
export interface InterviewQuestion {
  /** Question category. */
  category: "goal" | "scope" | "users" | "edge_cases" | "constraints" | "success" | "approach";
  /** The question text. */
  question: string;
  /** Why this question matters. */
  hint: string;
}

/** Structured output from a completed interview — ready to feed into prd_create. */
export interface InterviewResult {
  /** One-sentence goal. */
  goal: string;
  /** Problem statement for the PRD. */
  problem: string;
  /** Non-goals / out of scope. */
  nonGoals: string[];
  /** Edge cases to handle. */
  edgeCases: string[];
  /** Technical or business constraints. */
  constraints: string[];
  /** Acceptance criteria (testable). */
  acceptance: string[];
  /** Suggested implementation approach. */
  approach: string[];
  /** Suggested PRD title. */
  suggestedTitle: string;
}

// ─── Default Questions ─────────────────────────────────────────────

/** Built-in interview questions. Can be overridden with .agents/templates/interview.md. */
export const DEFAULT_QUESTIONS: InterviewQuestion[] = [
  {
    category: "goal",
    question: "What is the ONE thing this feature/change should achieve? Describe the end state in one sentence.",
    hint: "Forces clarity. If you can't say it in one sentence, the scope is too big.",
  },
  {
    category: "users",
    question: "Who benefits from this? (e.g. end users, developers, CI pipeline, agents)",
    hint: "Different users need different UX. An API for agents ≠ a UI for humans.",
  },
  {
    category: "scope",
    question: "What is explicitly OUT of scope? What should this NOT do?",
    hint: "Non-goals prevent scope creep. Name at least 2 things you're choosing not to build.",
  },
  {
    category: "edge_cases",
    question: "What happens when things go wrong? (empty input, network failure, concurrent access, huge data)",
    hint: "Edge cases account for 80% of bugs. Think about failure modes upfront.",
  },
  {
    category: "constraints",
    question: "Are there constraints? (existing API contracts, performance requirements, no new dependencies, backwards compatibility)",
    hint: "Constraints shape the solution. Missing a constraint means rework.",
  },
  {
    category: "success",
    question: "How will you know it's done? List 3-5 testable acceptance criteria.",
    hint: "If you can't test it, you can't ship it. Be specific: 'response < 200ms' not 'fast'.",
  },
  {
    category: "approach",
    question: "Do you have a preferred approach or pattern? Or should the agent decide?",
    hint: "If you have opinions on architecture (e.g. 'use existing parser'), say it now.",
  },
];

// ─── Interview Engine ──────────────────────────────────────────────

/**
 * Get interview questions — first tries project-specific template,
 * then falls back to built-in defaults.
 */
export async function getInterviewQuestions(
  projectPath: string,
): Promise<{ questions: InterviewQuestion[]; source: string }> {
  const templatePath = join(projectPath, ".agents", "templates", "interview.md");

  if (existsSync(templatePath)) {
    try {
      const content = await readFile(templatePath, "utf-8");
      const parsed = parseInterviewTemplate(content);
      if (parsed.length > 0) {
        return { questions: parsed, source: templatePath };
      }
    } catch { /* fall through to defaults */ }
  }

  return { questions: DEFAULT_QUESTIONS, source: "(built-in)" };
}

/**
 * Generate a structured interview prompt from a rough description.
 * Returns the full interview context the agent should use to ask questions.
 */
export function buildInterviewPrompt(
  roughDescription: string,
  questions: InterviewQuestion[],
): string {
  const lines: string[] = [
    "# 🎤 Intent Interview",
    "",
    `> Raw input: "${roughDescription}"`,
    "",
    "Before implementing anything, answer each question below. Use the answers to create a PRD.",
    "",
    "---",
    "",
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    lines.push(`## Q${i + 1}: ${q.category.replace(/_/g, " ").toUpperCase()}`);
    lines.push("");
    lines.push(`**${q.question}**`);
    lines.push("");
    lines.push(`_Hint: ${q.hint}_`);
    lines.push("");
    lines.push(`Answer: <!-- fill in -->`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## After completing the interview:");
  lines.push("");
  lines.push("1. Call `prd_create` with the title, problem, and owner from the answers");
  lines.push("2. Call `task_create` for each discrete unit of work");
  lines.push("3. Start the `feature_loop` on the first task");
  lines.push("");

  return lines.join("\n");
}

/**
 * Build a ready-to-use PRD from interview answers.
 * The agent fills in the InterviewResult and this produces the PRD content.
 */
export function interviewToPrd(result: InterviewResult): {
  title: string;
  problem: string;
  acceptance: string[];
} {
  return {
    title: result.suggestedTitle || result.goal,
    problem: result.problem,
    acceptance: result.acceptance,
  };
}

// ─── Template Parser ───────────────────────────────────────────────

/** Parse a custom interview.md template into questions. */
function parseInterviewTemplate(content: string): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  const lines = content.split("\n");

  let currentCategory: InterviewQuestion["category"] = "goal";
  let currentQuestion = "";
  let currentHint = "";

  for (const line of lines) {
    // Category headers: ## GOAL, ## SCOPE, etc.
    const categoryMatch = line.match(/^##\s+(?:Q\d+:\s*)?(\w+)/i);
    if (categoryMatch) {
      // Save previous question if exists
      if (currentQuestion) {
        questions.push({ category: currentCategory, question: currentQuestion, hint: currentHint });
      }
      const cat = categoryMatch[1].toLowerCase().replace(/\s+/g, "_");
      const validCats: InterviewQuestion["category"][] = [
        "goal", "scope", "users", "edge_cases", "constraints", "success", "approach",
      ];
      currentCategory = (validCats.includes(cat as InterviewQuestion["category"])
        ? cat
        : "goal") as InterviewQuestion["category"];
      currentQuestion = "";
      currentHint = "";
      continue;
    }

    // Question line: **bold text**
    const questionMatch = line.match(/^\*\*(.+)\*\*$/);
    if (questionMatch) {
      currentQuestion = questionMatch[1];
      continue;
    }

    // Hint line: _italic text_
    const hintMatch = line.match(/^_(?:Hint:\s*)?(.+)_$/);
    if (hintMatch) {
      currentHint = hintMatch[1];
      continue;
    }
  }

  // Save last question
  if (currentQuestion) {
    questions.push({ category: currentCategory, question: currentQuestion, hint: currentHint });
  }

  return questions;
}
