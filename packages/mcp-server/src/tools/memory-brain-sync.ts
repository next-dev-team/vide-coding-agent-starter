import { createMemoryBackend } from "@agent-kanban/core";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Tool definition for agent-kanban_memory_brain_sync. */
export const memoryBrainSyncTool = {
  name: "memory_brain_sync",
  description:
    "Generates a unified PROJECT_BRAIN.md document from the memory engine's L0 abstracts to give new agents and developers instant holistic project context.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: { type: "string", description: "Project root path. Defaults to cwd." },
    },
  },
};

/** Handle the memory_brain_sync tool call. */
export async function handleMemoryBrainSync(args: Record<string, unknown>): Promise<unknown> {
  const projectPath = (args.project_path as string) || process.cwd();
  const store = createMemoryBackend(projectPath);

  try {
    const memories = await Promise.resolve(store.overview());

    // Group by category
    const grouped: Record<string, typeof memories> = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    }

    // Build markdown content
    let content = `# Project Brain Context\n\n`;
    content += `> **Auto-generated** from the Agent Kanban memory engine.\n`;
    content += `> Read this document to instantly understand the project's tech stack, architecture, workflow, and conventions.\n\n`;

    const categoryTitles: Record<string, string> = {
      tech_stack: "Tech Stack",
      architecture: "Architecture",
      workflow: "Workflow",
      code_style: "Code Style",
      domain: "Domain",
      bugs: "Bugs & Gotchas",
      performance: "Performance",
      security: "Security",
    };

    for (const [cat, catMemories] of Object.entries(grouped)) {
      if (catMemories.length === 0) continue;
      const title = categoryTitles[cat] || cat;
      content += `## ${title}\n\n`;
      for (const m of catMemories) {
        content += `- **${m.slug}**: ${m.l0_abstract}\n`;
      }
      content += `\n`;
    }

    const brainPath = join(projectPath, "docs", "PROJECT_BRAIN.md");
    await writeFile(brainPath, content, "utf-8");

    return {
      synced: true,
      path: brainPath,
      totalMemories: memories.length,
    };
  } finally {
    store.close();
  }
}
