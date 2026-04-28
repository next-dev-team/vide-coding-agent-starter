/** Renders the Workflow panel — agent tools, reviews, and project settings. */
export function renderWorkflowPanel(version = ""): string {
  return `
  <!-- Agent Tools -->
  <div class="wf-group">
    <div class="wf-group-title">🤖 Agent Tools</div>
    <div class="wf-group-body">
      <button class="wf-btn primary" onclick="planFeature()">
        <span class="wf-icon">📝</span>
        <div class="wf-btn-text">
          <span class="wf-btn-label">Plan Next Feature</span>
          <span class="wf-btn-desc">Create a PRD from template</span>
        </div>
      </button>
      <div class="wf-row">
        <button class="wf-btn" onclick="requestReview('security')">
          <span class="wf-icon">🔒</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Security</span>
            <span class="wf-btn-desc">Review checklist</span>
          </div>
        </button>
        <button class="wf-btn" onclick="requestReview('performance')">
          <span class="wf-icon">⚡</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Performance</span>
            <span class="wf-btn-desc">Review checklist</span>
          </div>
        </button>
      </div>
      <button class="wf-btn" onclick="toggleSetup('wf-agents-md')" style="margin-top:2px">
        <span class="wf-icon">📄</span>
        <div class="wf-btn-text">
          <span class="wf-btn-label">Init AGENTS.md</span>
          <span class="wf-btn-desc">Scan repo & build agent config</span>
        </div>
        <span class="chevron" style="font-size:10px;margin-left:auto">›</span>
      </button>
      <div class="setup-collapsible" id="wf-agents-md" style="margin-top:6px">
        <p class="wf-hint">Include companion MCP server docs in AGENTS.md:</p>
        <label class="agents-md-check">
          <input type="checkbox" id="agents-include-context7" checked />
          <span class="agents-md-check-icon">📚</span>
          <div class="agents-md-check-text">
            <span class="agents-md-check-label">Context7</span>
            <span class="agents-md-check-desc">Live docs lookup for any library</span>
          </div>
        </label>
        <label class="agents-md-check">
          <input type="checkbox" id="agents-include-playwright" checked />
          <span class="agents-md-check-icon">🎭</span>
          <div class="agents-md-check-text">
            <span class="agents-md-check-label">Playwright</span>
            <span class="agents-md-check-desc">Browser automation & E2E testing</span>
          </div>
        </label>
        <button class="wf-btn primary" onclick="initAgentsMd()" style="margin-top:8px">
          <span class="wf-icon">🚀</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Generate AGENTS.md</span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Memory Backend -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('wf-mem')" style="cursor:pointer">
      🗄️ <span style="flex:1">Memory Backend</span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="wf-mem">
      <p class="wf-hint">Choose where agent memories are stored.</p>
      <div class="mem-toggle">
        <button id="mem-sqlite" class="active" onclick="setMemory('sqlite')">🗃 SQLite</button>
        <button id="mem-files" onclick="setMemory('files')">📄 Files</button>
      </div>
      <p class="wf-hint" style="margin-top:8px;font-size:10px">
        <strong>SQLite</strong> — fast FTS5 search, .agent-kanban/ (gitignored).<br>
        <strong>Files</strong> — Markdown in docs/memory/, committable.
      </p>
    </div>
  </div>

  <!-- About -->
  <div class="wf-group" style="opacity:0.7;margin-top:8px">
    <div class="wf-hint" style="text-align:center;padding:8px 0">
      ${version ? `<strong>Agent Kanban v${version}</strong> · ` : ""}
      <a href="#" onclick="openDocs();return false" style="color:var(--vscode-textLink-foreground);text-decoration:none">📖 Docs</a>
    </div>
  </div>`;
}
