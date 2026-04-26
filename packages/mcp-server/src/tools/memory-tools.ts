import { createMemoryBackend } from "@agent-kanban/core";
import type { MemoryCategory } from "@agent-kanban/core";
import { trackAbstractAccess, trackL2Read } from "./session-tracker.js";

// ─── memory_find ─────────────────────────────────────────────

/** Tool definition for agent-kanban_memory_find. */
export const memoryFindTool = {
  name: "memory_find",
  description:
    "Search project memories by keyword. Returns L0 abstracts only — no full content. Use memory_read to load the full content of a specific memory.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      query: { type: "string", description: "Full-text search query." },
      category: {
        type: "string",
        enum: ["tech_stack","architecture","workflow","code_style","domain","bugs","performance","security"],
        description: "Optional category filter.",
      },
      limit: { type: "number", description: "Max results to return. Defaults to 20." },
    },
    required: ["query"],
  },
};

/** Handle the memory_find tool call. */
export async function handleMemoryFind(args: Record<string, unknown>): Promise<unknown> {
  const projectPath = (args.project_path as string) || process.cwd();
  const query = args.query as string;
  const category = args.category as MemoryCategory | undefined;
  const limit = typeof args.limit === "number" ? args.limit : 20;

  const store = createMemoryBackend(projectPath);

  try {
    const results = await Promise.resolve(store.find(query, category, limit));

    // Track L1 access for each result (find = L1 index access)
    for (const m of results) {
      trackAbstractAccess(m.file_path, "L1", Math.ceil(m.l0_abstract.length / 4), m.token_count);
    }

    return { query, category, results };
  } finally {
    store.close();
  }
}

// ─── memory_overview ─────────────────────────────────────────

/** Tool definition for agent-kanban_memory_overview. */
export const memoryOverviewTool = {
  name: "memory_overview",
  description:
    "List all project memories grouped by category. Returns L0 abstracts only. Call this before loading any skill file to find the most relevant memory first.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      category: {
        type: "string",
        enum: ["tech_stack","architecture","workflow","code_style","domain","bugs","performance","security"],
        description: "Optional category filter.",
      },
    },
  },
};

/** Handle the memory_overview tool call. */
export async function handleMemoryOverview(args: Record<string, unknown>): Promise<unknown> {
  const projectPath = (args.project_path as string) || process.cwd();
  const category = args.category as MemoryCategory | undefined;

  const store = createMemoryBackend(projectPath);

  try {
    const memories = await Promise.resolve(store.overview(category));

    // Track L0 access for all returned entries
    for (const m of memories) {
      trackAbstractAccess(m.file_path, "L0", Math.ceil(m.l0_abstract.length / 4), m.token_count);
    }

    // Group by category for easier agent consumption
    const grouped: Record<string, typeof memories> = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    }

    return { total: memories.length, category, grouped };
  } finally {
    store.close();
  }
}

// ─── memory_read ─────────────────────────────────────────────

/** Tool definition for agent-kanban_memory_read. */
export const memoryReadTool = {
  name: "memory_read",
  description:
    "Load the full L2 content of a single memory file. This is the ONLY tool that returns full content — use memory_overview or memory_find to discover memory IDs first.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      id_or_path: {
        type: "string",
        description: "Numeric memory ID (e.g. '42') or absolute file path.",
      },
    },
    required: ["id_or_path"],
  },
};

/** Handle the memory_read tool call. */
export async function handleMemoryRead(args: Record<string, unknown>): Promise<unknown> {
  const projectPath = (args.project_path as string) || process.cwd();
  const idOrPath = args.id_or_path as string;

  const store = createMemoryBackend(projectPath);

  try {
    const content = await Promise.resolve(store.read(idOrPath));

    // Track L2 access
    const asNum = Number(idOrPath);
    let filePath: string;
    if (!Number.isNaN(asNum)) {
      const mem = await Promise.resolve(store.getById(asNum));
      filePath = mem?.file_path ?? idOrPath;
    } else {
      filePath = idOrPath;
    }

    trackL2Read(filePath, content);

    return { id_or_path: idOrPath, content };
  } finally {
    store.close();
  }
}
