import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  scanBoard,
  scanTasks,
  scanPrds,
  scanAdrs,
  nextId,
  moveTask,
  resolveTaskDir,
  parseTask,
  parseTaskFilename,
  writeTask,
  taskFilename,
  writePrd,
  prdFilename,
  writeAdr,
  adrFilename,
} from "@agent-kanban/core";
import type { TaskStatus, DocType } from "@agent-kanban/core";
import { readFile, readdir } from "node:fs/promises";

// ─── Memory tools ─────────────────────────────────────────────
import { compoundLearningsTool, handleCompoundLearnings } from "./compound-learnings.js";
import {
  memoryFindTool, handleMemoryFind,
  memoryOverviewTool, handleMemoryOverview,
  memoryReadTool, handleMemoryRead,
} from "./memory-tools.js";
import { memoryDedupeTool, handleMemoryDedupe } from "./memory-dedupe.js";
import { memorySessionTool, handleMemorySession } from "./memory-session.js";
import { memoryConfigSetTool, handleMemoryConfigSet } from "./memory-config.js";
import {
  worktreeCreateTool, handleWorktreeCreate,
  worktreeCleanupTool, handleWorktreeCleanup,
} from "./worktree.js";
import { prCreateTool, handlePrCreate } from "./pr-create.js";
import { featureLoopTool, handleFeatureLoop } from "./feature-loop.js";

/** Resolve project path — defaults to cwd. */
function resolveProjectPath(args: Record<string, unknown>): string {
  return (args.project_path as string) || process.cwd();
}

/** All MCP tool definitions. */
export function registerTools() {
  return [
    {
      name: "board_list",
      description:
        "List all tasks grouped by Kanban status columns (TODO, WIP, DONE, BLOCKED). Returns the full board state as structured JSON.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: {
            type: "string",
            description: "Project root path. Defaults to current working directory.",
          },
        },
      },
    },
    {
      name: "task_create",
      description:
        "Create a new task file from the project template. The file is created with todo- prefix in docs/tasks/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string", description: "Project root path." },
          prd_ref: { type: "string", description: "PRD reference path, e.g. docs/prd/0001-add-todo.md" },
          slug: { type: "string", description: "Kebab-case slug for filename, e.g. add-todo-input" },
          goal: { type: "string", description: "One-sentence goal for the task" },
          acceptance: {
            type: "array",
            items: { type: "string" },
            description: "List of testable acceptance criteria strings",
          },
        },
        required: ["slug", "goal"],
      },
    },
    {
      name: "task_move",
      description:
        "Move a task to a new status by renaming its file prefix (e.g. todo → wip → done).",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
          task_id: { type: "string", description: "Task ID, e.g. '0001' or '0002a'" },
          new_status: {
            type: "string",
            enum: ["todo", "wip", "done", "blocked"],
            description: "Target status",
          },
        },
        required: ["task_id", "new_status"],
      },
    },
    {
      name: "task_read",
      description: "Read a task file and return its parsed content as structured JSON.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
          task_id: { type: "string", description: "Task ID, e.g. '0001'" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "task_update",
      description:
        "Update a task field: tick/untick an acceptance criterion or append a note.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
          task_id: { type: "string", description: "Task ID" },
          action: {
            type: "string",
            enum: ["tick", "untick", "add_note"],
            description: "What to update",
          },
          criterion_index: {
            type: "number",
            description: "Zero-based index of the acceptance criterion (for tick/untick)",
          },
          note: {
            type: "string",
            description: "Note text to append (for add_note action)",
          },
        },
        required: ["task_id", "action"],
      },
    },
    {
      name: "prd_create",
      description: "Create a new PRD file from template in docs/prd/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
          title: { type: "string", description: "Feature title" },
          problem: { type: "string", description: "Problem statement" },
          owner: { type: "string", description: "Owner name" },
        },
        required: ["title", "problem"],
      },
    },
    {
      name: "prd_list",
      description: "List all PRDs with their status and title.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
        },
      },
    },
    {
      name: "adr_create",
      description: "Create a new ADR file from template in docs/decisions/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
          title: { type: "string", description: "Decision title" },
          context: { type: "string", description: "Context paragraph" },
          decision: { type: "string", description: "Decision paragraph" },
        },
        required: ["title", "context", "decision"],
      },
    },
    {
      name: "next_id",
      description: "Get the next available sequential ID for a document type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          project_path: { type: "string" },
          doc_type: {
            type: "string",
            enum: ["prd", "task", "adr"],
            description: "Document type",
          },
        },
        required: ["doc_type"],
      },
    },
    // ─── Memory tools ───────────────────────────────────────
    compoundLearningsTool,
    memoryFindTool,
    memoryOverviewTool,
    memoryReadTool,
    memoryDedupeTool,
    memorySessionTool,
    memoryConfigSetTool,
    // ─── Git automation tools ────────────────────────────────
    worktreeCreateTool,
    worktreeCleanupTool,
    prCreateTool,
    featureLoopTool,
  ];
}

/** Handle an MCP tool call. */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const projectPath = resolveProjectPath(args);

  try {
    let result: unknown;

    switch (name) {
      case "board_list": {
        result = await scanBoard(projectPath);
        break;
      }

      case "task_create": {
        const id = await nextId(projectPath, "task");
        const slug = args.slug as string;
        const acceptance = (args.acceptance as string[] | undefined)?.map(
          (text) => ({ checked: false, text }),
        );
        const content = writeTask({
          id,
          title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          prdRef: args.prd_ref as string | undefined,
          goal: args.goal as string,
          acceptance,
          approach: [],
        });
        const fname = taskFilename(id, slug);
        const filePath = join(projectPath, "docs", "tasks", fname);
        await writeFile(filePath, content, "utf-8");
        result = { created: fname, id, path: filePath };
        break;
      }

      case "task_move": {
        const newFilename = await moveTask(
          projectPath,
          args.task_id as string,
          args.new_status as TaskStatus,
        );
        result = { moved: true, newFilename };
        break;
      }

      case "task_read": {
        const tasks = await scanTasks(projectPath);
        const task = tasks.find((t) => t.id === args.task_id);
        if (!task) throw new Error(`Task ${args.task_id} not found`);
        result = task;
        break;
      }

      case "task_update": {
        const tasks = await scanTasks(projectPath);
        const task = tasks.find((t) => t.id === args.task_id);
        if (!task) throw new Error(`Task ${args.task_id} not found`);

        const filePath = join(resolveTaskDir(projectPath, task.status), task.filename);
        let content = await readFile(filePath, "utf-8");
        const action = args.action as string;

        if (action === "tick" || action === "untick") {
          const idx = args.criterion_index as number;
          const lines = content.split("\n");
          let checkboxCount = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^-\s+\[[ xX]\]/)) {
              if (checkboxCount === idx) {
                lines[i] = action === "tick"
                  ? lines[i].replace(/\[[ ]\]/, "[x]")
                  : lines[i].replace(/\[[xX]\]/, "[ ]");
                break;
              }
              checkboxCount++;
            }
          }
          content = lines.join("\n");
        } else if (action === "add_note") {
          const note = args.note as string;
          const notesIdx = content.indexOf("## Notes");
          if (notesIdx !== -1) {
            const afterNotes = content.indexOf("\n## ", notesIdx + 8);
            const insertPos = afterNotes === -1 ? content.length : afterNotes;
            content =
              content.slice(0, insertPos).trimEnd() +
              `\n- ${note}\n` +
              content.slice(insertPos);
          }
        }

        await writeFile(filePath, content, "utf-8");
        result = { updated: true, task_id: args.task_id, action };
        break;
      }

      case "prd_create": {
        const id = await nextId(projectPath, "prd");
        const slug = (args.title as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const content = writePrd({
          id,
          title: args.title as string,
          problem: args.problem as string,
          owner: args.owner as string | undefined,
        });
        const fname = prdFilename(id, slug);
        const filePath = join(projectPath, "docs", "prd", fname);
        await writeFile(filePath, content, "utf-8");
        result = { created: fname, id, path: filePath };
        break;
      }

      case "prd_list": {
        const prds = await scanPrds(projectPath);
        result = prds.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          filename: p.filename,
        }));
        break;
      }

      case "adr_create": {
        const id = await nextId(projectPath, "adr");
        const slug = (args.title as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const content = writeAdr({
          id,
          title: args.title as string,
          context: args.context as string,
          decision: args.decision as string,
        });
        const fname = adrFilename(id, slug);
        const filePath = join(projectPath, "docs", "decisions", fname);
        await writeFile(filePath, content, "utf-8");
        result = { created: fname, id, path: filePath };
        break;
      }

      case "next_id": {
        const id = await nextId(projectPath, args.doc_type as DocType);
        result = { next_id: id, doc_type: args.doc_type };
        break;
      }

      // ─── Memory tools ─────────────────────────────────────
      case "compound_learnings": {
        result = await handleCompoundLearnings(args);
        break;
      }

      case "memory_find": {
        result = await handleMemoryFind(args);
        break;
      }

      case "memory_overview": {
        result = await handleMemoryOverview(args);
        break;
      }

      case "memory_read": {
        result = await handleMemoryRead(args);
        break;
      }

      case "memory_dedupe": {
        result = await handleMemoryDedupe(args);
        break;
      }

      case "memory_session": {
        result = handleMemorySession(args);
        break;
      }

      case "memory_config_set": {
        result = handleMemoryConfigSet(args);
        break;
      }

      // ─── Git automation tools ─────────────────────────────
      case "worktree_create": {
        result = await handleWorktreeCreate(args);
        break;
      }

      case "worktree_cleanup": {
        result = await handleWorktreeCleanup(args);
        break;
      }

      case "pr_create": {
        result = await handlePrCreate(args);
        break;
      }

      case "feature_loop": {
        result = await handleFeatureLoop(args);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }
}
