import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

// ── Tool Definition ───────────────────────────────────────────────

export const docsSyncTool = {
  name: "docs_sync",
  description:
    "Sync project documentation (PRDs, Tasks) with the codebase. If updated_content is provided, it overwrites the file. Otherwise, it returns the file content and instructions for the agent to reconcile it against the codebase.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: {
        type: "string",
        description: "Project root path. Defaults to cwd.",
      },
      target_file: {
        type: "string",
        description: "Path to the document to sync, relative to project root (e.g., 'docs/prd/0001-feature.md').",
      },
      updated_content: {
        type: "string",
        description: "Optional. The updated markdown content to save to the target file.",
      },
    },
    required: ["target_file"],
  },
};

// ── Handler ───────────────────────────────────────────────────────

export async function handleDocsSync(args: Record<string, unknown>): Promise<any> {
  const projectPath = (args.project_path as string) || process.cwd();
  const targetFile = args.target_file as string;
  const fullPath = join(projectPath, targetFile);

  if (!existsSync(fullPath)) {
    throw new Error(`Target file not found: ${targetFile}`);
  }

  if (args.updated_content) {
    await writeFile(fullPath, args.updated_content as string, "utf-8");
    return { success: true, message: `Successfully updated ${targetFile} to sync with codebase.` };
  } else {
    const content = await readFile(fullPath, "utf-8");
    return {
      file: targetFile,
      content,
      instructions: "Analyze the current state of the codebase. Does this document accurately reflect the code? If there is drift, rewrite the document and call docs_sync again passing the reconciled markdown in `updated_content`.",
    };
  }
}
