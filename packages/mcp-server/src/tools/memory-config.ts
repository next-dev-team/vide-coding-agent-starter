import { saveMemoryConfig } from "@agent-kanban/core";
import type { MemoryBackendId } from "@agent-kanban/core";

/** Tool definition for memory_config_set. */
export const memoryConfigSetTool = {
  name: "memory_config_set",
  description:
    "Set the memory backend for the project. " +
    "Use 'sqlite' (default, fast, FTS5 search) or 'files' (plain Markdown under docs/memory/, human-readable, git-committable). " +
    "The change takes effect on the next memory tool call.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
      backend: {
        type: "string",
        enum: ["sqlite", "files"],
        description: "Backend to activate.",
      },
    },
    required: ["backend"],
  },
};

/** Handle the memory_config_set tool call. */
export function handleMemoryConfigSet(args: Record<string, unknown>): unknown {
  const projectPath = (args.project_path as string) || process.cwd();
  const backend = args.backend as MemoryBackendId;

  saveMemoryConfig(projectPath, { backend });

  return { set: true, backend };
}
