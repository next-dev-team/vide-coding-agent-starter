import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, normalize, resolve } from "node:path";
import { existsSync } from "node:fs";

export type WorkspaceProjectKind =
  | "root"
  | "monorepo_package"
  | "vscode_workspace_folder"
  | "sibling";

/** A discoverable project root (monorepo package, VS Code folder, or Kanban-enabled repo). */
export interface WorkspaceProjectEntry {
  name: string;
  /** Absolute filesystem path. */
  path: string;
  /** Path relative to the resolved workspace root. */
  relativePath: string;
  kind: WorkspaceProjectKind;
  /** True when `docs/tasks/` exists under this path. */
  hasKanban: boolean;
  description?: string;
}

export interface WorkspaceProjectList {
  rootPath: string;
  isMonorepo: boolean;
  vscodeWorkspaceFile?: string;
  projects: WorkspaceProjectEntry[];
}

export interface ListWorkspaceProjectsOptions {
  /** Include packages under `packages/` and `apps/` when this is a monorepo. Default true. */
  includeMonorepoPackages?: boolean;
  /** Parse a `.code-workspace` file in the project root. Default true. */
  includeVscodeWorkspace?: boolean;
  /** Scan the parent directory for sibling folders with `docs/tasks/`. Default false. */
  includeParentSiblings?: boolean;
}

function hasKanbanTasksDir(projectPath: string): boolean {
  return existsSync(join(projectPath, "docs", "tasks"));
}

async function readPackageMeta(
  pkgPath: string,
  fallbackName: string,
): Promise<{ name: string; description?: string }> {
  try {
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { name?: string; description?: string };
    return { name: pkg.name ?? fallbackName, description: pkg.description };
  } catch {
    return { name: fallbackName };
  }
}

function entry(
  rootPath: string,
  absPath: string,
  kind: WorkspaceProjectKind,
  meta?: { name?: string; description?: string },
): WorkspaceProjectEntry {
  const normalizedRoot = normalize(resolve(rootPath));
  const normalizedPath = normalize(resolve(absPath));
  const name = meta?.name ?? basename(normalizedPath);
  return {
    name,
    path: normalizedPath,
    relativePath:
      normalizedPath === normalizedRoot
        ? "."
        : normalizedPath.slice(normalizedRoot.length + 1).replace(/\\/g, "/"),
    kind,
    hasKanban: hasKanbanTasksDir(normalizedPath),
    description: meta?.description,
  };
}

async function scanPackageDir(
  rootPath: string,
  subdir: "packages" | "apps",
  seen: Set<string>,
  out: WorkspaceProjectEntry[],
): Promise<void> {
  const dir = join(rootPath, subdir);
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const absPath = join(dir, ent.name);
    const key = normalize(resolve(absPath));
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = await readPackageMeta(join(absPath, "package.json"), ent.name);
    out.push(entry(rootPath, absPath, "monorepo_package", meta));
  }
}

async function parseVscodeWorkspaceFile(
  workspaceFilePath: string,
  seen: Set<string>,
  out: WorkspaceProjectEntry[],
): Promise<void> {
  const raw = await readFile(workspaceFilePath, "utf-8");
  const parsed = JSON.parse(raw) as {
    folders?: Array<{ name?: string; path: string }>;
  };
  const baseDir = dirname(workspaceFilePath);
  for (const folder of parsed.folders ?? []) {
    const absPath = resolve(baseDir, folder.path);
    const key = normalize(absPath);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      entry(baseDir, absPath, "vscode_workspace_folder", {
        name: folder.name ?? basename(absPath),
      }),
    );
  }
}

async function findVscodeWorkspaceFile(projectPath: string): Promise<string | undefined> {
  const entries = await readdir(projectPath, { withFileTypes: true });
  const match = entries.find(
    (e) => e.isFile() && e.name.endsWith(".code-workspace"),
  );
  return match ? join(projectPath, match.name) : undefined;
}

async function scanParentSiblings(
  projectPath: string,
  seen: Set<string>,
  out: WorkspaceProjectEntry[],
): Promise<void> {
  const parent = dirname(resolve(projectPath));
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(parent, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const absPath = join(parent, ent.name);
    if (!hasKanbanTasksDir(absPath)) continue;
    const key = normalize(resolve(absPath));
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = await readPackageMeta(join(absPath, "package.json"), ent.name);
    out.push(entry(parent, absPath, "sibling", meta));
  }
}

/**
 * Discover workspace projects: monorepo packages, VS Code multi-root folders,
 * and optionally Kanban-enabled sibling repos.
 */
export async function listWorkspaceProjects(
  projectPath: string,
  options: ListWorkspaceProjectsOptions = {},
): Promise<WorkspaceProjectList> {
  const {
    includeMonorepoPackages = true,
    includeVscodeWorkspace = true,
    includeParentSiblings = false,
  } = options;

  const rootPath = normalize(resolve(projectPath));
  const rootPkg = existsSync(join(rootPath, "package.json"))
    ? await readPackageMeta(join(rootPath, "package.json"), basename(rootPath))
    : { name: basename(rootPath) };
  const isMonorepo =
    existsSync(join(rootPath, "pnpm-workspace.yaml")) ||
    existsSync(join(rootPath, "lerna.json"));

  const seen = new Set<string>();
  const projects: WorkspaceProjectEntry[] = [];

  const rootKey = normalize(rootPath);
  seen.add(rootKey);
  projects.push(entry(rootPath, rootPath, "root", rootPkg));

  if (includeMonorepoPackages && isMonorepo) {
    await scanPackageDir(rootPath, "packages", seen, projects);
    await scanPackageDir(rootPath, "apps", seen, projects);
  }

  let vscodeWorkspaceFile: string | undefined;
  if (includeVscodeWorkspace) {
    vscodeWorkspaceFile = await findVscodeWorkspaceFile(rootPath);
    if (vscodeWorkspaceFile) {
      await parseVscodeWorkspaceFile(vscodeWorkspaceFile, seen, projects);
    }
  }

  if (includeParentSiblings) {
    await scanParentSiblings(rootPath, seen, projects);
  }

  projects.sort((a, b) => a.name.localeCompare(b.name));

  return {
    rootPath,
    isMonorepo: Boolean(
      existsSync(join(rootPath, "pnpm-workspace.yaml")) ||
        existsSync(join(rootPath, "lerna.json")),
    ),
    vscodeWorkspaceFile,
    projects,
  };
}
