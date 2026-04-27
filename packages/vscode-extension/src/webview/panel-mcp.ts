/**
 * Renders the MCP panel — server setup, tool reference, and resource listing.
 * All tool/resource names are copyable with a click.
 */
export function renderMcpPanel(): string {
  // ── Tool definitions grouped by category ──
  const toolGroups: Array<{
    title: string;
    icon: string;
    tools: Array<{ name: string; desc: string }>;
  }> = [
    {
      title: "Board & Tasks",
      icon: "📋",
      tools: [
        { name: "board_list", desc: "List tasks grouped by Kanban status" },
        { name: "task_create", desc: "Create a new task from template" },
        { name: "task_read", desc: "Read a task by ID" },
        { name: "task_update", desc: "Tick/untick criteria or add notes" },
        { name: "task_move", desc: "Move task between statuses" },
        { name: "next_id", desc: "Get next available sequential ID" },
      ],
    },
    {
      title: "PRDs & ADRs",
      icon: "📝",
      tools: [
        { name: "prd_create", desc: "Create a new PRD from template" },
        { name: "prd_list", desc: "List all PRDs with status" },
        { name: "adr_create", desc: "Create an architectural decision record" },
      ],
    },
    {
      title: "Memory",
      icon: "🧠",
      tools: [
        { name: "memory_overview", desc: "List all memories by category (L0)" },
        { name: "memory_find", desc: "Full-text search memories" },
        { name: "memory_read", desc: "Load full L2 content of a memory" },
        { name: "memory_session", desc: "View session memory access log" },
        { name: "memory_dedupe", desc: "Deduplication sweep" },
        { name: "memory_config_set", desc: "Switch memory backend" },
        { name: "compound_learnings", desc: "Extract learnings from a done task" },
      ],
    },
    {
      title: "Git & Automation",
      icon: "🔀",
      tools: [
        { name: "worktree_create", desc: "Create git worktree for a task" },
        { name: "worktree_cleanup", desc: "Remove a task worktree" },
        { name: "pr_create", desc: "Create a GitHub draft PR" },
        { name: "feature_loop", desc: "Generate full feature orchestration plan" },
      ],
    },
    {
      title: "Project",
      icon: "📂",
      tools: [
        { name: "agents_generate", desc: "Scan repo & generate AGENTS.md" },
      ],
    },
  ];

  // ── Resources ──
  const resources: Array<{ uri: string; desc: string }> = [
    { uri: "kanban://board", desc: "Full board state" },
    { uri: "kanban://tasks", desc: "All tasks as JSON" },
    { uri: "kanban://prds", desc: "All PRDs" },
    { uri: "kanban://adrs", desc: "All ADRs" },
    { uri: "kanban://review/security", desc: "Security review checklist" },
    { uri: "kanban://review/performance", desc: "Performance review checklist" },
  ];

  // ── Build HTML ──
  const toolGroupsHtml = toolGroups.map((g) => {
    const rows = g.tools
      .map(
        (t) => `
      <div class="mcp-tool-row" onclick="copyToolName('${t.name}')" title="Click to copy">
        <code class="mcp-tool-name">${t.name}</code>
        <span class="mcp-tool-desc">${t.desc}</span>
        <span class="mcp-copy-icon">📋</span>
      </div>`,
      )
      .join("");
    return `
    <div class="mcp-tool-group">
      <div class="wf-sub-title">${g.icon} ${g.title}</div>
      ${rows}
    </div>`;
  }).join("");

  const resourceRows = resources
    .map(
      (r) => `
    <div class="mcp-tool-row" onclick="copyToolName('${r.uri}')" title="Click to copy">
      <code class="mcp-tool-name" style="font-size:10px">${r.uri}</code>
      <span class="mcp-tool-desc">${r.desc}</span>
      <span class="mcp-copy-icon">📋</span>
    </div>`,
    )
    .join("");

  return `
  <!-- MCP Setup -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('wf-mcp')" style="cursor:pointer">
      🚀 <span style="flex:1">Setup</span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="wf-mcp">
      <p class="wf-hint">One-click setup for your AI client.</p>

      <div class="wf-sub-title">Agent Kanban</div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <button class="wf-btn compact" onclick="setupMcp('vscode')">
          <span class="wf-icon">💎</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">VS Code (Copilot)</span>
            <span class="wf-btn-desc">.vscode/mcp.json</span>
          </div>
        </button>
        <button class="wf-btn compact" onclick="setupMcp('antigravity')">
          <span class="wf-icon">🚀</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Antigravity</span>
            <span class="wf-btn-desc">~/.gemini/antigravity/mcp_config.json</span>
          </div>
        </button>
        <button class="wf-btn compact" onclick="setupMcp('cursor')">
          <span class="wf-icon">⚡</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Cursor</span>
            <span class="wf-btn-desc">.cursor/mcp.json</span>
          </div>
        </button>
      </div>

      <div class="wf-sub-title" style="margin-top:10px">Companion Servers</div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <button class="wf-btn compact" onclick="setupCompanion('context7')">
          <span class="wf-icon">📚</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Context7</span>
            <span class="wf-btn-desc">Live docs lookup for any library</span>
          </div>
        </button>
        <button class="wf-btn compact" onclick="setupCompanion('playwright')">
          <span class="wf-icon">🎭</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Playwright</span>
            <span class="wf-btn-desc">Browser automation & testing</span>
          </div>
        </button>
      </div>

      <button class="wf-btn compact" onclick="reloadWindow()" style="margin-top:8px">🔄 Reload Window</button>
    </div>
  </div>

  <!-- Tool Reference -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('wf-tools')" style="cursor:pointer">
      🔧 <span style="flex:1">Tools <span style="opacity:0.5;font-weight:400">(${toolGroups.reduce((s, g) => s + g.tools.length, 0)})</span></span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="wf-tools">
      <p class="wf-hint">Click any tool name to copy it.</p>
      ${toolGroupsHtml}
    </div>
  </div>

  <!-- Resources -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('wf-resources')" style="cursor:pointer">
      📦 <span style="flex:1">Resources <span style="opacity:0.5;font-weight:400">(${resources.length})</span></span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="wf-resources">
      <p class="wf-hint">MCP resources available to agents.</p>
      ${resourceRows}
    </div>
  </div>`;
}
