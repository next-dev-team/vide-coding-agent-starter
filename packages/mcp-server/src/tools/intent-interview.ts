import { getInterviewQuestions, buildInterviewPrompt } from "@agent-kanban/core";

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for intent_interview. */
export const intentInterviewTool = {
  name: "intent_interview",
  description:
    "Run a structured intent interview before implementing a feature. Returns a set of clarifying questions the agent should answer to produce a well-scoped PRD. Inspired by OMX's $deep-interview — prevents agents from building the wrong thing.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      description: {
        type: "string",
        description: "Rough feature description from the user, e.g. 'add real-time chat to the dashboard'",
      },
    },
    required: ["description"],
  },
};

// ── Handler ───────────────────────────────────────────────────────

/** Generate a structured interview for intent clarification. */
export async function handleIntentInterview(
  args: Record<string, unknown>,
): Promise<{
  description: string;
  questionCount: number;
  source: string;
  interview: string;
  nextSteps: string[];
}> {
  const projectPath = (args.project_path as string) || process.cwd();
  const description = args.description as string;

  if (!description || description.trim().length === 0) {
    throw new Error("Description is required. Tell me what you want to build.");
  }

  const { questions, source } = await getInterviewQuestions(projectPath);
  const interview = buildInterviewPrompt(description, questions);

  return {
    description,
    questionCount: questions.length,
    source,
    interview,
    nextSteps: [
      "1. Answer each question in the interview above",
      "2. Use the answers to call prd_create with title, problem, and owner",
      "3. Call task_create to break the PRD into implementable tasks",
      "4. Run feature_loop on the first task",
    ],
  };
}
