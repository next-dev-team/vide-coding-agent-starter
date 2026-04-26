import {
  scanBoard,
  scanTasks,
  scanPrds,
  scanAdrs,
} from "@agent-kanban/core";

/** All MCP resource definitions. */
export function registerResources() {
  return [
    {
      uri: "kanban://board",
      name: "Kanban Board",
      description: "Full board state with all tasks grouped by status columns",
      mimeType: "application/json",
    },
    {
      uri: "kanban://tasks",
      name: "All Tasks",
      description: "All tasks as a flat list",
      mimeType: "application/json",
    },
    {
      uri: "kanban://prds",
      name: "All PRDs",
      description: "All product requirement documents",
      mimeType: "application/json",
    },
    {
      uri: "kanban://adrs",
      name: "All ADRs",
      description: "All architecture decision records",
      mimeType: "application/json",
    },
  ];
}

/** Handle reading an MCP resource. */
export async function handleResourceRead(
  uri: string,
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  const projectPath = process.cwd();

  let data: unknown;

  switch (uri) {
    case "kanban://board":
      data = await scanBoard(projectPath);
      break;
    case "kanban://tasks":
      data = await scanTasks(projectPath);
      break;
    case "kanban://prds":
      data = await scanPrds(projectPath);
      break;
    case "kanban://adrs":
      data = await scanAdrs(projectPath);
      break;
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
