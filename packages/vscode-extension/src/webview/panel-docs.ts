import type { Prd, Adr, Task } from "@agent-kanban/core";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/** Status badge colors for PRDs. */
function prdStatusBadge(status: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: "var(--vscode-charts-yellow)", fg: "#000" },
    approved: { bg: "var(--vscode-charts-green)", fg: "#fff" },
    shipped: { bg: "var(--vscode-charts-blue)", fg: "#fff" },
  };
  const c = colors[status] ?? { bg: "var(--vscode-badge-background)", fg: "var(--vscode-badge-foreground)" };
  return `<span class="doc-status-badge" style="background:${c.bg};color:${c.fg}">${escapeHtml(status.toUpperCase())}</span>`;
}

/** Status badge colors for ADRs. */
function adrStatusBadge(status: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    proposed: { bg: "var(--vscode-charts-yellow)", fg: "#000" },
    accepted: { bg: "var(--vscode-charts-green)", fg: "#fff" },
    deprecated: { bg: "var(--vscode-charts-red)", fg: "#fff" },
  };
  const c = colors[status] ?? { bg: "var(--vscode-badge-background)", fg: "var(--vscode-badge-foreground)" };
  return `<span class="doc-status-badge" style="background:${c.bg};color:${c.fg}">${escapeHtml(status.toUpperCase())}</span>`;
}

/** Status badge colors for tasks. */
function taskStatusBadge(status: string): string {
  const colors: Record<string, { bg: string; fg: string }> = {
    todo: { bg: "var(--vscode-charts-blue)", fg: "#fff" },
    wip: { bg: "var(--vscode-charts-yellow)", fg: "#000" },
    done: { bg: "var(--vscode-charts-green)", fg: "#fff" },
    blocked: { bg: "var(--vscode-charts-red)", fg: "#fff" },
  };
  const c = colors[status] ?? { bg: "var(--vscode-badge-background)", fg: "var(--vscode-badge-foreground)" };
  return `<span class="doc-status-badge" style="background:${c.bg};color:${c.fg}">${escapeHtml(status.toUpperCase())}</span>`;
}

/** Render a single PRD card. */
function renderPrdCard(prd: Prd): string {
  const checkedCount = prd.acceptance.filter(a => a.checked).length;
  const totalAc = prd.acceptance.length;
  const acSummary = totalAc > 0 ? `${checkedCount}/${totalAc} criteria` : "";

  return `
  <div class="doc-card" onclick="openPrd('${escapeHtml(prd.filename)}')">
    <div class="doc-card-header">
      <div class="doc-card-id">#${escapeHtml(prd.id)}</div>
      ${prdStatusBadge(prd.status)}
    </div>
    <div class="doc-card-title">${escapeHtml(prd.title || prd.slug.replace(/-/g, " "))}</div>
    ${prd.problem ? `<div class="doc-card-excerpt">${escapeHtml(prd.problem.slice(0, 120))}${prd.problem.length > 120 ? "…" : ""}</div>` : ""}
    <div class="doc-card-footer">
      ${prd.owner ? `<span class="doc-card-meta">👤 ${escapeHtml(prd.owner)}</span>` : ""}
      ${prd.created ? `<span class="doc-card-meta">📅 ${escapeHtml(prd.created)}</span>` : ""}
      ${acSummary ? `<span class="doc-card-meta">✅ ${acSummary}</span>` : ""}
    </div>
  </div>`;
}

/** Render a single ADR card. */
function renderAdrCard(adr: Adr): string {
  return `
  <div class="doc-card" onclick="openAdr('${escapeHtml(adr.filename)}')">
    <div class="doc-card-header">
      <div class="doc-card-id">#${escapeHtml(adr.id)}</div>
      ${adrStatusBadge(adr.status)}
    </div>
    <div class="doc-card-title">${escapeHtml(adr.title || adr.slug.replace(/-/g, " "))}</div>
    ${adr.context ? `<div class="doc-card-excerpt">${escapeHtml(adr.context.slice(0, 120))}${adr.context.length > 120 ? "…" : ""}</div>` : ""}
    <div class="doc-card-footer">
      ${adr.date ? `<span class="doc-card-meta">📅 ${escapeHtml(adr.date)}</span>` : ""}
    </div>
  </div>`;
}

/** Render a single Task card for the docs panel. */
function renderTaskDocCard(task: Task): string {
  const checkedCount = task.acceptance.filter(a => a.checked).length;
  const totalAc = task.acceptance.length;
  const pct = totalAc > 0 ? Math.round((checkedCount / totalAc) * 100) : 0;

  return `
  <div class="doc-card" onclick="openFile('${escapeHtml(task.filename)}')">
    <div class="doc-card-header">
      <div class="doc-card-id">#${escapeHtml(task.id)}</div>
      ${taskStatusBadge(task.status)}
    </div>
    <div class="doc-card-title">${escapeHtml(task.goal || task.slug.replace(/-/g, " "))}</div>
    ${totalAc > 0 ? `
    <div class="doc-card-progress">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span>${checkedCount}/${totalAc}</span>
    </div>` : ""}
    <div class="doc-card-footer">
      ${task.prdRef ? `<span class="doc-card-meta">📋 ${escapeHtml(task.prdRef)}</span>` : ""}
      ${task.created ? `<span class="doc-card-meta">📅 ${escapeHtml(task.created)}</span>` : ""}
    </div>
  </div>`;
}

/** Info for the docs panel data structure. */
export interface DocsData {
  prds: Prd[];
  adrs: Adr[];
  tasks: Task[];
}

/** Renders the Docs panel — tabbed view of PRDs, ADRs, and Tasks with readable markdown. */
export function renderDocsPanel(data: DocsData): string {
  const { prds, adrs, tasks } = data;

  // Sub-tab bar for doc types
  const prdSection = prds.length === 0
    ? '<div class="empty">No PRDs found — create one in docs/prd/</div>'
    : prds.map(p => renderPrdCard(p)).join("");

  const adrSection = adrs.length === 0
    ? '<div class="empty">No ADRs found — create one in docs/decisions/</div>'
    : adrs.map(a => renderAdrCard(a)).join("");

  const taskSection = tasks.length === 0
    ? '<div class="empty">No tasks found — create one in docs/tasks/</div>'
    : tasks.map(t => renderTaskDocCard(t)).join("");

  return `
  <div class="header">
    <h2>📄 Project Docs</h2>
    <button class="btn-refresh" onclick="refresh()" title="Refresh">↻</button>
  </div>

  <!-- Doc sub-tabs -->
  <div class="doc-sub-tabs">
    <button class="doc-sub-tab active" id="doc-sub-prd" onclick="switchDocSub('prd')">
      📋 PRDs <span class="badge">${prds.length}</span>
    </button>
    <button class="doc-sub-tab" id="doc-sub-adr" onclick="switchDocSub('adr')">
      📜 ADRs <span class="badge">${adrs.length}</span>
    </button>
    <button class="doc-sub-tab" id="doc-sub-tasks" onclick="switchDocSub('tasks')">
      📝 Tasks <span class="badge">${tasks.length}</span>
    </button>
  </div>

  <!-- PRD panel -->
  <div class="doc-sub-panel active" id="doc-panel-prd">
    ${prdSection}
  </div>

  <!-- ADR panel -->
  <div class="doc-sub-panel" id="doc-panel-adr">
    ${adrSection}
  </div>

  <!-- Tasks panel -->
  <div class="doc-sub-panel" id="doc-panel-tasks">
    ${taskSection}
  </div>

  <!-- Preview area (shown when a doc is expanded inline) -->
  <div class="doc-preview-overlay" id="doc-preview" style="display:none">
    <div class="doc-preview-header">
      <button class="doc-preview-back" onclick="closeDocPreview()">← Back</button>
      <button class="doc-preview-open" id="doc-preview-open-btn" onclick="openPreviewedDoc()">Open in Editor</button>
    </div>
    <div class="doc-preview-content" id="doc-preview-content"></div>
  </div>`;
}
