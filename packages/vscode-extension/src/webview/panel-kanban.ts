import type { Board } from "@agent-kanban/core";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCardList(board: Board, status: string): string {
  const col = board.columns.find(c => c.status === status);
  const tasks = col ? col.tasks : [];
  if (tasks.length === 0) return '<div class="empty">No tasks</div>';

  return tasks.map(task => {
    const total = task.acceptance.length;
    const checked = task.acceptance.filter(a => a.checked).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const moveTargets = ["todo", "wip", "done", "blocked"].filter(s => s !== task.status);
    return `
    <div class="card" data-status="${task.status}" onclick="openFile('${task.filename}')">
      <div class="card-header"><div class="card-id">#${task.id}</div></div>
      <div class="card-goal">${escapeHtml(task.goal || task.slug.replace(/-/g, " "))}</div>
      ${total > 0 ? `<div class="card-progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>${checked}/${total}</span>
      </div>` : ""}
      <div class="card-actions" onclick="event.stopPropagation()">
        ${moveTargets.map(s => `<button class="move-btn" onclick="moveTask('${task.id}','${s}')">${s}</button>`).join("")}
        ${task.status === "done" ? `<button class="move-btn" style="background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-color:var(--vscode-button-background)" onclick="compoundLearnings('${task.id}')">⚡ Compound</button>` : ""}
      </div>
    </div>`;
  }).join("");
}

export function renderWorkflowTools(): string {
  return `
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="move-btn" style="padding:6px 0;font-size:11px" onclick="planFeature()">📝 Plan Next Feature (PRD)</button>
      <div style="display:flex;gap:4px">
        <button class="move-btn" style="flex:1;font-size:10px" onclick="requestReview('security')">🔒 Security Review</button>
        <button class="move-btn" style="flex:1;font-size:10px" onclick="requestReview('performance')">⚡ Performance Review</button>
      </div>
    </div>`;
}

/** Renders the Kanban overview panel with accordions. */
export function renderKanbanPanel(board: Board): string {
  const allStatuses = ["todo", "wip", "blocked", "done"];
  const defaultOpen = new Set(["todo", "wip"]);

  const columnSections = allStatuses.map(status => {
    const col = board.columns.find(c => c.status === status) || { status, label: status.toUpperCase(), tasks: [] };
    const isOpen = defaultOpen.has(col.status);
    const cards = renderCardList(board, status);
    
    return `
    <div class="section ${isOpen ? "open" : ""}" id="section-${col.status}" data-status="${col.status}">
      <div class="section-header" onclick="toggleSection('${col.status}')">
        <div class="section-title"><span class="section-dot"></span><span>${col.label}</span></div>
        <div class="section-meta"><span class="badge">${col.tasks.length}</span><span class="chevron">›</span></div>
      </div>
      <div class="section-body">${cards}</div>
    </div>`;
  }).join("");

  return `
  <div class="header">
    <h2>${board.totalTasks} tasks</h2>
    <button class="btn-refresh" onclick="refresh()" title="Refresh">↻</button>
  </div>
  ${columnSections}
  <div class="section" id="section-workflow-tools" data-status="workflow">
    <div class="section-header" onclick="toggleSection('workflow-tools')">
      <div class="section-title">
        <span class="section-dot" style="background:#3498db"></span>
        <span>Workflow Tools</span>
      </div>
      <div class="section-meta"><span class="chevron">›</span></div>
    </div>
    <div class="section-body">
      ${renderWorkflowTools()}
    </div>
  </div>`;
}

export function renderColumnPanel(board: Board, status: string): string {
  return `
  <div class="header">
    <h2>${status.toUpperCase()}</h2>
    <button class="btn-refresh" onclick="refresh()" title="Refresh">↻</button>
  </div>
  <div class="section-body" style="padding-top:10px">
    ${renderCardList(board, status)}
  </div>`;
}

export function renderWorkflowPanel(): string {
  return `
  <div class="header">
    <h2>WORKFLOW TOOLS</h2>
    <button class="btn-refresh" onclick="refresh()" title="Refresh">↻</button>
  </div>
  <div class="section-body" style="padding-top:10px">
    ${renderWorkflowTools()}
  </div>`;
}
