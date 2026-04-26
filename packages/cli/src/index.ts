#!/usr/bin/env node

import { resolve, join, basename } from "node:path";
import { readdir, readFile, mkdir, copyFile, writeFile, stat } from "node:fs/promises";
import prompts from "prompts";
import pc from "picocolors";

// ─── Constants ─────────────────────────────────────────────────

const TEMPLATES_DIR = resolve(
  new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"),
  "..",
  "..",
  "..",
  "templates",
);

// ─── Helpers ───────────────────────────────────────────────────

interface TemplateJson {
  name: string;
  description: string;
  stack: Record<string, string>;
  postInstall?: string;
  firstTask?: string;
}

/** List available template directories. */
async function listTemplates(): Promise<
  Array<{ dirName: string; meta: TemplateJson }>
> {
  const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
  const templates: Array<{ dirName: string; meta: TemplateJson }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "shared") continue;
    try {
      const metaPath = join(TEMPLATES_DIR, entry.name, "template.json");
      const raw = await readFile(metaPath, "utf-8");
      templates.push({ dirName: entry.name, meta: JSON.parse(raw) });
    } catch {
      // skip directories without template.json
    }
  }

  return templates;
}

/** Recursively copy a directory, merging into destination. */
async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      // Skip template.json — it's metadata, not a project file
      if (entry.name === "template.json") continue;
      await mkdir(join(dest, ".."), { recursive: true });
      await copyFile(srcPath, destPath);
    }
  }
}

/** Check if a directory exists and is empty (or doesn't exist). */
async function isDirEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch {
    return true; // doesn't exist = effectively empty
  }
}

// ─── Commands ──────────────────────────────────────────────────

/** Show available templates. */
async function cmdList(): Promise<void> {
  const templates = await listTemplates();

  console.log(pc.bold("\nAvailable templates:\n"));
  for (const t of templates) {
    console.log(
      `  ${pc.cyan(t.dirName.padEnd(22))} ${t.meta.description}`,
    );
    const stack = Object.entries(t.meta.stack)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    console.log(`  ${"".padEnd(22)} ${pc.dim(stack)}`);
    console.log();
  }

  if (templates.length === 0) {
    console.log(pc.yellow("  No templates found. Check templates/ directory."));
  }
}

/** Scaffold a new project. */
async function cmdInit(
  targetDir: string | undefined,
  templateName: string | undefined,
): Promise<void> {
  const templates = await listTemplates();

  if (templates.length === 0) {
    console.error(pc.red("No templates found. Check templates/ directory."));
    process.exit(1);
  }

  // Interactive mode if args are missing
  if (!targetDir) {
    const res = await prompts({
      type: "text",
      name: "dir",
      message: "Project directory:",
      initial: "my-project",
    });
    targetDir = res.dir;
    if (!targetDir) process.exit(0);
  }

  if (!templateName) {
    const res = await prompts({
      type: "select",
      name: "template",
      message: "Choose a template:",
      choices: templates.map((t) => ({
        title: `${t.meta.name} ${pc.dim(`— ${t.meta.description}`)}`,
        value: t.dirName,
      })),
    });
    templateName = res.template;
    if (!templateName) process.exit(0);
  }

  const template = templates.find((t) => t.dirName === templateName);
  if (!template) {
    console.error(
      pc.red(`Template "${templateName}" not found. Use --list to see options.`),
    );
    process.exit(1);
  }

  const dest = resolve(targetDir);
  const dirEmpty = await isDirEmpty(dest);
  if (!dirEmpty) {
    const res = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Directory "${basename(dest)}" is not empty. Continue?`,
      initial: false,
    });
    if (!res.overwrite) process.exit(0);
  }

  console.log();
  console.log(
    pc.bold(`Scaffolding ${pc.cyan(template.meta.name)} into ${pc.green(basename(dest))}...`),
  );
  console.log();

  // 1. Copy shared files
  const sharedDir = join(TEMPLATES_DIR, "shared");
  try {
    await copyDir(sharedDir, dest);
    console.log(`  ${pc.green("✓")} Copied shared workflow files`);
  } catch {
    console.log(`  ${pc.yellow("⚠")} No shared template found, skipping`);
  }

  // 2. Copy template-specific files (overrides shared)
  const templateDir = join(TEMPLATES_DIR, template.dirName);
  await copyDir(templateDir, dest);
  console.log(`  ${pc.green("✓")} Copied ${template.meta.name} template`);

  // 3. Create docs directories
  for (const dir of ["docs/prd", "docs/tasks", "docs/decisions"]) {
    await mkdir(join(dest, dir), { recursive: true });
  }
  console.log(`  ${pc.green("✓")} Created docs/ structure`);

  console.log();
  console.log(pc.bold(pc.green("Done! ")) + "Next steps:");
  console.log();
  console.log(`  ${pc.cyan("cd")} ${basename(dest)}`);

  if (template.meta.postInstall) {
    console.log(`  ${pc.cyan(template.meta.postInstall)}`);
  }

  if (template.meta.firstTask) {
    console.log();
    console.log(
      `  Your first task: ${pc.yellow(template.meta.firstTask)}`,
    );
    console.log(
      `  Open it and hand it to your AI agent, or start coding!`,
    );
  }

  console.log();
}

/** Validate project structure. */
async function cmdDoctor(): Promise<void> {
  const cwd = process.cwd();
  console.log(pc.bold("\nChecking project structure...\n"));

  const checks = [
    { path: "docs", label: "docs/ directory" },
    { path: "docs/prd", label: "docs/prd/ directory" },
    { path: "docs/tasks", label: "docs/tasks/ directory" },
    { path: "docs/decisions", label: "docs/decisions/ directory" },
    { path: "AGENTS.md", label: "AGENTS.md" },
    { path: ".agents", label: ".agents/ directory" },
    { path: ".agents/templates", label: ".agents/templates/ directory" },
    { path: ".agents/workflows", label: ".agents/workflows/ directory" },
  ];

  let allGood = true;
  for (const check of checks) {
    try {
      await stat(join(cwd, check.path));
      console.log(`  ${pc.green("✓")} ${check.label}`);
    } catch {
      console.log(`  ${pc.red("✗")} ${check.label} — missing`);
      allGood = false;
    }
  }

  console.log();
  if (allGood) {
    console.log(pc.green("All checks passed!"));
  } else {
    console.log(
      pc.yellow(
        "Some items are missing. Run `create-kanban-app . --template blank` to fix.",
      ),
    );
  }
  console.log();
}

// ─── Main ──────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${pc.bold("create-kanban-app")} — Scaffold a project with agent-driven Kanban workflow

${pc.bold("Usage:")}
  create-kanban-app [directory] [--template <name>]
  create-kanban-app --list
  create-kanban-app doctor

${pc.bold("Options:")}
  --template, -t   Template to use (see --list)
  --list, -l       Show available templates
  --help, -h       Show this help
`);
  process.exit(0);
}

if (args.includes("--list") || args.includes("-l")) {
  await cmdList();
} else if (args[0] === "doctor") {
  await cmdDoctor();
} else {
  const templateIdx = args.findIndex((a) => a === "--template" || a === "-t");
  const templateName = templateIdx !== -1 ? args[templateIdx + 1] : undefined;
  const targetDir = args.find(
    (a) => !a.startsWith("-") && a !== templateName && a !== "doctor",
  );
  await cmdInit(targetDir, templateName);
}
