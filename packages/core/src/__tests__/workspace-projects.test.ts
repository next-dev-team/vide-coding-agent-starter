import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { listWorkspaceProjects } from "../workspace-projects.js";

let TMP = "";

beforeEach(async () => {
  TMP = await mkdtemp(join(tmpdir(), "kanban-ws-"));
});

afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe("listWorkspaceProjects", () => {
  it("includes root when docs/tasks exists", async () => {
    await mkdir(join(TMP, "docs", "tasks"), { recursive: true });
    await writeFile(
      join(TMP, "package.json"),
      JSON.stringify({ name: "root-app", description: "Main" }),
    );

    const result = await listWorkspaceProjects(TMP);
    expect(result.projects.some((p) => p.kind === "root" && p.hasKanban)).toBe(true);
    expect(result.projects.find((p) => p.kind === "root")?.name).toBe("root-app");
  });

  it("lists monorepo packages under packages/", async () => {
    await writeFile(join(TMP, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    await mkdir(join(TMP, "docs", "tasks"), { recursive: true });
    await mkdir(join(TMP, "packages", "core", "docs", "tasks"), { recursive: true });
    await writeFile(
      join(TMP, "packages", "core", "package.json"),
      JSON.stringify({ name: "@app/core", description: "Core pkg" }),
    );

    const result = await listWorkspaceProjects(TMP);
    const pkg = result.projects.find((p) => p.kind === "monorepo_package");
    expect(pkg?.name).toBe("@app/core");
    expect(pkg?.hasKanban).toBe(true);
  });

  it("parses .code-workspace folders", async () => {
    const sibling = join(TMP, "other-repo");
    await mkdir(join(sibling, "docs", "tasks"), { recursive: true });
    await writeFile(
      join(TMP, "team.code-workspace"),
      JSON.stringify({
        folders: [{ name: "Other", path: "other-repo" }],
      }),
    );

    const result = await listWorkspaceProjects(TMP);
    expect(result.vscodeWorkspaceFile).toContain("team.code-workspace");
    const folder = result.projects.find((p) => p.kind === "vscode_workspace_folder");
    expect(folder?.name).toBe("Other");
    expect(folder?.hasKanban).toBe(true);
  });

  it("lists parent siblings when requested", async () => {
    const parent = join(TMP, "parent");
    const a = join(parent, "repo-a");
    const b = join(parent, "repo-b");
    await mkdir(join(a, "docs", "tasks"), { recursive: true });
    await mkdir(join(b, "docs", "tasks"), { recursive: true });
    await writeFile(join(a, "package.json"), JSON.stringify({ name: "repo-a" }));

    const result = await listWorkspaceProjects(a, { includeParentSiblings: true });
    const siblings = result.projects.filter((p) => p.kind === "sibling");
    expect(siblings.length).toBeGreaterThanOrEqual(1);
    expect(siblings.some((p) => p.name === "repo-b")).toBe(true);
  });
});
