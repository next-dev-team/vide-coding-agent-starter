/** Renders the Workflow panel — agent tools, review triggers, and project setup. */
export function renderWorkflowPanel(): string {
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
    </div>
  </div>

  <!-- MCP Server Setup -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('wf-mcp')" style="cursor:pointer">
      🚀 <span style="flex:1">MCP Server</span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="wf-mcp">
      <p class="wf-hint">Connect your AI agent to this Kanban board.</p>
      <div style="display:flex;flex-direction:column;gap:4px">
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
      <button class="wf-btn compact" onclick="reloadWindow()" style="margin-top:6px">🔄 Reload Window</button>
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
      <strong>Agent Kanban v0.1.1</strong> ·
      <a href="#" onclick="openDocs();return false" style="color:var(--vscode-textLink-foreground);text-decoration:none">📖 Docs</a>
    </div>
  </div>`;
}
