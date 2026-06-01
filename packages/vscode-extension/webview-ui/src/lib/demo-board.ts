import type { Board } from "$lib/types";

/** Static fixture used for `vite preview` and the host-less Hello-World load. */
export const demoBoard: Board = {
  totalTasks: 5,
  workspaceName: "agent-kanban-demo",
  columns: [
    {
      status: "todo",
      label: "TODO",
      tasks: [
        {
          id: "0015",
          slug: "port-kanban-to-svelte",
          filename: "docs/tasks/todo-0015-port-kanban-to-svelte.md",
          status: "todo",
          projectName: "agent-kanban-demo",
          goal: "Port the Kanban tab to the new Svelte webview-ui",
          acceptance: [
            { text: "Wide board renders in editor area", checked: false },
            { text: "Drag-and-drop between columns", checked: false },
            { text: "Sidebar accordion still works", checked: false },
          ],
        },
        {
          id: "0016",
          slug: "drag-and-drop",
          filename: "docs/tasks/todo-0016-drag-and-drop.md",
          status: "todo",
          goal: "Add drag-and-drop with svelte-dnd-action",
          acceptance: [],
        },
      ],
    },
    {
      status: "wip",
      label: "WIP",
      tasks: [
        {
          id: "0014",
          slug: "scaffold-webview-ui",
          filename: "docs/tasks/wip-0014-scaffold-webview-ui.md",
          status: "wip",
          goal: "Scaffold packages/webview-ui with Vite + Svelte + Tailwind",
          acceptance: [
            { text: "Package builds cleanly", checked: true },
            { text: "Theme bridge wired", checked: true },
            { text: "Two entry points (sidebar + board)", checked: true },
            { text: "Host integrates manifest", checked: false },
          ],
        },
      ],
    },
    {
      status: "verified",
      label: "VERIFIED",
      tasks: [],
    },
    {
      status: "done",
      label: "DONE",
      tasks: [
        {
          id: "0013",
          slug: "add-qa-test-cases",
          filename: "docs/tasks/done-0013-add-qa-test-cases.md",
          status: "done",
          goal: "Add support for tracking and managing QA test cases",
          acceptance: [
            { text: "Create a markdown template for QA test cases", checked: true },
            { text: "Provide a CLI tool to generate a test case", checked: true },
          ],
        },
      ],
    },
    {
      status: "blocked",
      label: "BLOCKED",
      tasks: [
        {
          id: "0017",
          slug: "ci-publish-vsix",
          filename: "docs/tasks/blocked-0017-ci-publish-vsix.md",
          status: "blocked",
          goal: "Publish VSIX from CI on tag push",
          acceptance: [],
        },
      ],
    },
  ],
};
