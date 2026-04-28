import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { existsSync } from "node:fs";
import { handleMemoryBrainSync } from "./memory-brain-sync.js";

// ── Tool Definition ───────────────────────────────────────────────

/** MCP tool definition for agents_generate. */
export const agentsGenerateTool = {
  name: "agents_generate",
  description:
    "Scan the project context (directory structure, package.json, config files, docs/) and generate an AGENTS.md file with project info, tech stack, commands, structure, and conventions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      project_path: {
        type: "string",
        description: "Project root path. Defaults to cwd.",
      },
      dry_run: {
        type: "boolean",
        description: "If true, returns the generated content without writing. Defaults to false.",
      },
    },
  },
};

// ── Context Scanner ───────────────────────────────────────────────

/** Detected project context from scanning the repo. */
interface ProjectContext {
  name: string;
  description: string;
  isMonorepo: boolean;
  packageManager: string;
  language: string;
  runtime: string;
  framework: string | null;
  buildTool: string | null;
  testFramework: string | null;
  packages: PackageInfo[];
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  hasTypescript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  hasDocsDir: boolean;
  hasAgentsDir: boolean;
  hasTemplatesDir: boolean;
  structure: string[];
  configFiles: string[];
}

interface PackageInfo {
  name: string;
  path: string;
  description: string;
}

/** Read JSON file safely. */
async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** List top-level entries in a directory (files + dirs). */
async function listEntries(
  dirPath: string,
): Promise<Array<{ name: string; isDir: boolean }>> {
  try {
    const entries = await readdir(dirPath);
    const results: Array<{ name: string; isDir: boolean }> = [];
    for (const entry of entries) {
      // Skip hidden dirs (except .agents), node_modules, dist, and build artifacts
      if (entry.startsWith(".") && entry !== ".agents") continue;
      if (["node_modules", "dist", ".git"].includes(entry)) continue;
      try {
        const s = await stat(join(dirPath, entry));
        results.push({ name: entry, isDir: s.isDirectory() });
      } catch {
        // skip
      }
    }
    return results;
  } catch {
    return [];
  }
}

/** Build a tree string from directory scan (2 levels deep). */
async function buildTree(rootPath: string, maxDepth = 2): Promise<string[]> {
  const lines: string[] = [];
  const rootName = basename(rootPath) + "/";
  lines.push(rootName);

  async function walk(dir: string, prefix: string, depth: number): Promise<void> {
    if (depth >= maxDepth) return;
    const entries = await listEntries(dir);
    // Sort: dirs first, then files
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const nextPrefix = isLast ? "    " : "│   ";

      if (entry.isDir) {
        lines.push(`${prefix}${connector}${entry.name}/`);
        await walk(join(dir, entry.name), prefix + nextPrefix, depth + 1);
      } else {
        lines.push(`${prefix}${connector}${entry.name}`);
      }
    }
  }

  await walk(rootPath, "", 0);
  return lines;
}

/** Detect tech stack from config files and dependencies. */
function detectStack(
  pkg: Record<string, unknown>,
  configFiles: string[],
): {
  language: string;
  runtime: string;
  framework: string | null;
  buildTool: string | null;
  testFramework: string | null;
} {
  const allDeps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  const depNames = Object.keys(allDeps);

  // Language
  let language = "JavaScript";
  if (depNames.includes("typescript") || configFiles.includes("tsconfig.json")) {
    language = "TypeScript";
  }

  // Runtime
  let runtime = "Node.js";
  if (configFiles.includes("deno.json") || configFiles.includes("deno.jsonc")) {
    runtime = "Deno";
  } else if (configFiles.includes("bun.lockb")) {
    runtime = "Bun";
  }

  // Framework
  let framework: string | null = null;
  if (depNames.includes("next")) framework = "Next.js";
  else if (depNames.includes("nuxt")) framework = "Nuxt";
  else if (depNames.includes("react")) framework = "React";
  else if (depNames.includes("vue")) framework = "Vue";
  else if (depNames.includes("svelte") || depNames.includes("@sveltejs/kit")) framework = "Svelte";
  else if (depNames.includes("express")) framework = "Express";
  else if (depNames.includes("fastify")) framework = "Fastify";
  else if (depNames.includes("@modelcontextprotocol/sdk")) framework = "MCP SDK";

  // Build tool
  let buildTool: string | null = null;
  if (depNames.includes("esbuild")) buildTool = "esbuild";
  else if (depNames.includes("vite")) buildTool = "Vite";
  else if (depNames.includes("webpack")) buildTool = "webpack";
  else if (depNames.includes("rollup")) buildTool = "Rollup";
  else if (depNames.includes("tsup")) buildTool = "tsup";
  if (language === "TypeScript" && !buildTool) buildTool = "tsc";

  // Test framework
  let testFramework: string | null = null;
  if (depNames.includes("vitest")) testFramework = "vitest";
  else if (depNames.includes("jest")) testFramework = "Jest";
  else if (depNames.includes("mocha")) testFramework = "Mocha";

  return { language, runtime, framework, buildTool, testFramework };
}

/** Scan a project and collect context. */
async function scanProjectContext(projectPath: string): Promise<ProjectContext> {
  // Root package.json
  const pkg = (await readJson(join(projectPath, "package.json"))) ?? {};
  const scripts = (pkg.scripts as Record<string, string>) ?? {};

  // Config files
  const configCandidates = [
    "tsconfig.json", "tsconfig.base.json",
    ".eslintrc.json", ".eslintrc.js", "eslint.config.js", "eslint.config.mjs",
    ".prettierrc", ".prettierrc.json", "prettier.config.js",
    "vitest.config.ts", "vitest.config.js",
    "jest.config.ts", "jest.config.js",
    "vite.config.ts", "vite.config.js",
    "next.config.js", "next.config.mjs", "next.config.ts",
    "pnpm-workspace.yaml", "lerna.json", "turbo.json",
    ".github/workflows", "Dockerfile", "docker-compose.yml",
    "deno.json", "deno.jsonc", "bun.lockb",
  ];
  const configFiles: string[] = [];
  for (const cf of configCandidates) {
    if (existsSync(join(projectPath, cf))) configFiles.push(cf);
  }

  // Monorepo detection
  const isMonorepo =
    existsSync(join(projectPath, "pnpm-workspace.yaml")) ||
    existsSync(join(projectPath, "lerna.json")) ||
    Boolean((pkg.workspaces as unknown));

  // Package manager
  let packageManager = "npm";
  if (existsSync(join(projectPath, "pnpm-lock.yaml"))) packageManager = "pnpm";
  else if (existsSync(join(projectPath, "yarn.lock"))) packageManager = "yarn";
  else if (existsSync(join(projectPath, "bun.lockb"))) packageManager = "bun";

  // Detect tech stack
  const stack = detectStack(pkg, configFiles);

  // Scan workspace packages (monorepo)
  const packages: PackageInfo[] = [];
  if (isMonorepo) {
    const packagesDir = join(projectPath, "packages");
    if (existsSync(packagesDir)) {
      const entries = await readdir(packagesDir);
      for (const entry of entries) {
        const pkgPath = join(packagesDir, entry, "package.json");
        const subPkg = await readJson(pkgPath);
        if (subPkg) {
          packages.push({
            name: (subPkg.name as string) ?? entry,
            path: `packages/${entry}`,
            description: (subPkg.description as string) ?? "",
          });
        }
      }
    }
  }

  // Dependencies
  const deps = Object.keys((pkg.dependencies as Record<string, string>) ?? {});
  const devDeps = Object.keys((pkg.devDependencies as Record<string, string>) ?? {});

  // Directory presence
  const hasDocsDir = existsSync(join(projectPath, "docs"));
  const hasAgentsDir = existsSync(join(projectPath, ".agents"));
  const hasTemplatesDir = existsSync(join(projectPath, "templates"));

  // Build tree
  const structure = await buildTree(projectPath, 2);

  return {
    name: (pkg.name as string) ?? basename(projectPath),
    description: (pkg.description as string) ?? "",
    isMonorepo,
    packageManager,
    ...stack,
    packages,
    scripts,
    dependencies: deps,
    devDependencies: devDeps,
    hasTypescript: stack.language === "TypeScript",
    hasEslint: configFiles.some((f) => f.includes("eslint")),
    hasPrettier: configFiles.some((f) => f.includes("prettier")),
    hasDocsDir,
    hasAgentsDir,
    hasTemplatesDir,
    structure,
    configFiles,
  };
}

// ── AGENTS.md Generator ───────────────────────────────────────────

/** Generate AGENTS.md content from project context. */
function generateAgentsMd(ctx: ProjectContext): string {
  const lines: string[] = [];

  // Header
  lines.push("# AGENTS.md", "");
  lines.push("Instructions for AI coding agents working in this repo.", "");

  // Project
  lines.push("## Project", "");
  lines.push(`**${ctx.name}**${ctx.description ? ` — ${ctx.description}` : ""}`, "");
  if (ctx.packages.length > 0) {
    lines.push(`This is a ${ctx.packageManager} monorepo with ${ctx.packages.length} packages:`, "");
    for (const pkg of ctx.packages) {
      lines.push(`- **\`${pkg.name}\`** (${pkg.path})${pkg.description ? ` — ${pkg.description}` : ""}`);
    }
    lines.push("");
  }

  // Project Brain
  if (ctx.hasDocsDir) {
    lines.push("## Project Brain", "");
    lines.push("To get holistic context, conventions, and architectural details about this project, read:");
    lines.push("- **[`docs/PROJECT_BRAIN.md`](docs/PROJECT_BRAIN.md)**", "");
    lines.push("It is automatically synthesized from the project's memory engine.", "");
  }

  // Tech Stack
  lines.push("## Tech Stack", "");
  lines.push("| Layer | Choice | Notes |");
  lines.push("| ----- | ------ | ----- |");
  lines.push(`| Language | ${ctx.language} | ${ctx.hasTypescript ? "Type-safe" : "Dynamic"} |`);
  lines.push(`| Runtime | ${ctx.runtime} | |`);
  lines.push(`| Package Manager | ${ctx.packageManager} | ${ctx.isMonorepo ? "Monorepo with workspaces" : ""} |`);
  if (ctx.framework) lines.push(`| Framework | ${ctx.framework} | |`);
  if (ctx.buildTool) lines.push(`| Build | ${ctx.buildTool} | |`);
  if (ctx.testFramework) lines.push(`| Test | ${ctx.testFramework} | |`);
  lines.push("");
  lines.push("Do **not** add new packages without asking. Propose with a one-line reason first.", "");

  // Commands
  lines.push("## Commands", "");
  if (Object.keys(ctx.scripts).length > 0) {
    lines.push("| Task | Command |");
    lines.push("| ---- | ------- |");
    lines.push(`| Install deps | \`${ctx.packageManager} install\` |`);
    for (const [name, cmd] of Object.entries(ctx.scripts)) {
      if (["build", "test", "lint", "typecheck", "dev", "clean", "start"].includes(name)) {
        lines.push(`| ${name.charAt(0).toUpperCase() + name.slice(1)} | \`${ctx.packageManager} ${name}\` |`);
      }
    }
    lines.push("");
    lines.push(`Always run \`${ctx.packageManager} build\` and \`${ctx.packageManager} test\` before saying a task is done.`, "");
  }

  // Project Structure
  lines.push("## Project Structure", "");
  lines.push("```");
  for (const line of ctx.structure) {
    lines.push(line);
  }
  lines.push("```", "");

  // Coding Conventions
  lines.push("## Coding Conventions", "");
  if (ctx.hasTypescript) {
    lines.push("- **File names**: `kebab-case.ts`. Class names: `PascalCase`. Variables: `camelCase`.");
    lines.push("- **Imports**: `node:` prefix for builtins. Package imports first, then relative.");
    lines.push("- **Type-only imports**: use `import type { ... }` when importing only types.");
    lines.push("- **No `any`** — use proper TypeScript types.");
  } else {
    lines.push("- **File names**: `kebab-case.js`. Variables: `camelCase`.");
    lines.push("- **Imports**: Package imports first, then relative.");
  }
  lines.push("- **Functions over classes** when there's no internal state.");
  lines.push("- **No `console.log`** in library code — return structured data. OK in CLI/scripts.");
  lines.push("");

  // Workflow (if docs/ structure exists)
  if (ctx.hasDocsDir || ctx.hasAgentsDir) {
    lines.push("## Workflow", "");
    if (ctx.hasAgentsDir) {
      lines.push("When the user gives you a **PRD** or **task file**, follow the loop in `.agents/workflows/feature-loop.md`.", "");
      lines.push("When making a **non-trivial architectural choice**, write an ADR using `.agents/templates/adr.md`.", "");
      lines.push("When the user describes a **new feature in chat without a PRD**, offer to draft one first before writing code.", "");
    }
    if (ctx.hasDocsDir) {
      lines.push("Task files in `docs/tasks/` use a status prefix in the filename:", "");
      lines.push("| Prefix | Meaning |");
      lines.push("| ------ | ------- |");
      lines.push("| `todo-` | Not started |");
      lines.push("| `wip-` | In progress |");
      lines.push("| `done-` | Completed (archived to `docs/tasks/done/`) |");
      lines.push("| `blocked-` | Blocked, see Notes section |");
      lines.push("");
      lines.push("Rename the file to update status — don't edit a status field inside.", "");
    }
  }

  // What to Ask vs Assume
  lines.push("## What to Ask vs Assume", "");
  lines.push("**Ask the user before:**", "");
  lines.push("- Adding any new dependency");
  if (ctx.isMonorepo) lines.push("- Changing the monorepo structure");
  lines.push("- Deleting files");
  lines.push("- Adding external API calls");
  lines.push("- Starting a non-trivial task without a PRD");
  lines.push("");
  lines.push("**Assume and proceed when:**", "");
  lines.push("- Creating new modules/functions that follow existing patterns");
  lines.push("- Writing tests for new code");
  lines.push("- Fixing lint warnings or type errors");
  lines.push("- Adding JSDoc comments");
  lines.push("");

  // Definition of Done
  lines.push("## Definition of Done", "");
  lines.push("A task is done when:", "");
  lines.push(`1. Code compiles (\`${ctx.packageManager} build\` clean)`);
  lines.push(`2. Tests pass (\`${ctx.packageManager} test\`)`);
  lines.push("3. New behavior has at least one test");
  if (ctx.hasTypescript) lines.push("4. No new TypeScript errors");
  lines.push(`${ctx.hasTypescript ? "5" : "4"}. Public APIs have a one-line JSDoc (\`/** ... */\`)`);
  if (ctx.hasDocsDir) lines.push(`${ctx.hasTypescript ? "6" : "5"}. Task file renamed to \`done-*.md\``);
  lines.push("");

  return lines.join("\n");
}

// ── Handler ───────────────────────────────────────────────────────

/** Scan project context and generate AGENTS.md. */
export async function handleAgentsGenerate(
  args: Record<string, unknown>,
): Promise<{
  generated: boolean;
  path: string;
  context: Omit<ProjectContext, "structure">;
  content: string;
}> {
  const projectPath = (args.project_path as string) || process.cwd();
  const dryRun = args.dry_run === true;

  const ctx = await scanProjectContext(projectPath);
  const content = generateAgentsMd(ctx);

  if (!dryRun) {
    const { writeFile: wf } = await import("node:fs/promises");
    const agentsPath = join(projectPath, "AGENTS.md");
    await wf(agentsPath, content, "utf-8");

    try {
      await handleMemoryBrainSync({ project_path: projectPath });
    } catch {
      // ignore if memory store isn't initialized yet
    }
  }

  // Return context without the large structure array for JSON output
  const { structure: _s, ...contextWithoutStructure } = ctx;

  return {
    generated: !dryRun,
    path: join(projectPath, "AGENTS.md"),
    context: contextWithoutStructure,
    content,
  };
}
