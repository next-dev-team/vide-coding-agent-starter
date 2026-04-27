/** Renders the Settings panel body (MCP setup, memory backend, about). */
export function renderSettingsPanel(): string {
  return `
  <!-- MCP Server Setup -->
  <div class="setup-section open" id="ss-onboard">
    <div class="setup-section-header" onclick="toggleSetup('ss-onboard')">
      <span>🚀</span><span style="flex:1">MCP Server Setup</span><span class="chevron">›</span>
    </div>
    <div class="setup-section-body">
      <p class="setup-label">Connect your AI agent to this board in one click.</p>
      <ol class="step-list">
        <li>Click <strong>Setup MCP Server</strong> below</li>
        <li>Reload VS Code window</li>
        <li>Ask Copilot: <em>"Show my Kanban board"</em></li>
      </ol>
      <button class="setup-btn" onclick="setupMcp()">⚡ Setup MCP Server (.vscode/mcp.json)</button>
      <button class="setup-btn secondary" onclick="reloadWindow()" style="margin-top:4px">🔄 Reload Window</button>
    </div>
  </div>

  <!-- Memory Backend -->
  <div class="setup-section" id="ss-memory">
    <div class="setup-section-header" onclick="toggleSetup('ss-memory')">
      <span>🗄️</span><span style="flex:1">Memory Backend</span><span class="chevron">›</span>
    </div>
    <div class="setup-section-body">
      <p class="setup-label">Choose where agent memories are stored.</p>
      <div class="mem-toggle">
        <button id="mem-sqlite" class="active" onclick="setMemory('sqlite')">🗃 SQLite (default)</button>
        <button id="mem-files" onclick="setMemory('files')">📄 Markdown Files</button>
      </div>
      <p class="setup-label" style="margin-top:8px;font-size:10px">
        <strong>SQLite</strong> — fast FTS5 search, stored in .agent-kanban/ (gitignored).<br>
        <strong>Markdown</strong> — human-readable files in docs/memory/, committable to git.
      </p>
    </div>
  </div>

  <!-- About -->
  <div class="setup-section" id="ss-about">
    <div class="setup-section-header" onclick="toggleSetup('ss-about')">
      <span>ℹ️</span><span style="flex:1">About</span><span class="chevron">›</span>
    </div>
    <div class="setup-section-body">
      <p class="setup-label"><strong>Agent Kanban v0.1.1</strong></p>
      <p class="setup-label">Markdown-based Kanban board for AI-agent-driven workflows. Tasks live in <code>docs/tasks/*.md</code> — both you and your agent read &amp; write the same files.</p>
      <button class="setup-btn secondary" onclick="openDocs()">📖 View README</button>
    </div>
  </div>`;
}
