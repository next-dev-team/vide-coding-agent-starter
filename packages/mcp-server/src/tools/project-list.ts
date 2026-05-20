import { listWorkspaceProjects } from "@agent-kanban/core";

/** MCP tool: discover monorepo packages, VS Code workspace folders, and Kanban roots. */
export const projectListTool = {
  name: "project_list",
  description:
    "List workspace projects discoverable from a root path: the root itself, monorepo packages (packages/, apps/), folders from a .code-workspace file, and optionally Kanban-enabled sibling repos. Use before task_create when unsure which project_path to pass.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: {
        type: "string",
        description: "Workspace or project root. Defaults to current working directory.",
      },
      include_monorepo_packages: {
        type: "boolean",
        description: "Include packages/ and apps/ when the root is a monorepo. Default true.",
      },
      include_vscode_workspace: {
        type: "boolean",
        description: "Parse a .code-workspace file in the project root. Default true.",
      },
      include_parent_siblings: {
        type: "boolean",
        description:
          "Scan the parent directory for sibling folders with docs/tasks/. Useful for multi-repo VS Code workspaces. Default false.",
      },
    },
  },
};

/** Handle project_list tool invocation. */
export async function handleProjectList(
  args: Record<string, unknown>,
): Promise<ReturnType<typeof listWorkspaceProjects>> {
  const projectPath = (args.project_path as string) || process.cwd();
  return listWorkspaceProjects(projectPath, {
    includeMonorepoPackages: args.include_monorepo_packages !== false,
    includeVscodeWorkspace: args.include_vscode_workspace !== false,
    includeParentSiblings: args.include_parent_siblings === true,
  });
}
