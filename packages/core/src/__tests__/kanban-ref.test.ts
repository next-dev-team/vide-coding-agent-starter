import { describe, expect, it } from "vitest";
import {
  buildKanbanTaskRef,
  buildKanbanTaskRefFull,
  projectNameFromRoot,
} from "../kanban-ref.js";

describe("projectNameFromRoot", () => {
  it("uses the last path segment on Windows paths", () => {
    expect(projectNameFromRoot("C:\\repos\\my-app\\")).toBe("my-app");
  });
});

describe("buildKanbanTaskRef", () => {
  it("includes project name when set on the task", () => {
    expect(
      buildKanbanTaskRef({ id: "0000", projectName: "vide-coding-agent-starter" }),
    ).toBe("kanban vide-coding-agent-starter : #0000");
  });

  it("derives project name from projectRoot", () => {
    expect(
      buildKanbanTaskRef({
        id: "12",
        projectRoot: "/home/user/repos/agent-kanban",
      }),
    ).toBe("kanban agent-kanban : #12");
  });

  it("uses fallback project name when task has no project fields", () => {
    expect(
      buildKanbanTaskRef({ id: "0000" }, { fallbackProjectName: "my-monorepo" }),
    ).toBe("kanban my-monorepo : #0000");
  });

  it("omits project segment only when no name is available", () => {
    expect(buildKanbanTaskRef({ id: "0000" })).toBe("kanban : #0000");
  });
});

describe("buildKanbanTaskRefFull", () => {
  it("appends status and goal", () => {
    expect(
      buildKanbanTaskRefFull(
        {
          id: "0001",
          projectName: "my-app",
          status: "wip",
          goal: "Port the Kanban tab",
        },
      ),
    ).toBe("kanban my-app : #0001 (wip) Port the Kanban tab");
  });
});
