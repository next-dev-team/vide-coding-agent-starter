/** Skill descriptor passed from the extension backend. */
export interface SkillInfo {
  /** Unique slug derived from file path. */
  slug: string;
  /** Human-readable name (from YAML frontmatter or filename). */
  name: string;
  /** Short description (from YAML frontmatter). */
  description: string;
  /** Source format of the skill. */
  format: "local" | "vercel" | "cursor" | "copilot" | "claude";
  /** Relative path from workspace root. */
  path: string;
  /** Whether the skill is currently active/linked. */
  active: boolean;
}

/** Agent target for skill distribution. */
export interface AgentTarget {
  id: string;
  name: string;
  icon: string;
  configPath: string;
  description: string;
}

/** Well-known agent targets. */
const AGENT_TARGETS: AgentTarget[] = [
  { id: "local", name: "Local Skills", icon: "📁", configPath: ".agents/skills/", description: "SKILL.md files in .agents/skills/" },
  { id: "copilot", name: "GitHub Copilot", icon: "💎", configPath: ".github/copilot-instructions.md", description: "Copilot custom instructions" },
  { id: "cursor", name: "Cursor", icon: "⚡", configPath: ".cursor/rules/", description: "Cursor rules directory" },
  { id: "antigravity", name: "Antigravity", icon: "🚀", configPath: "~/.gemini/antigravity/skills/", description: "Antigravity skills" },
  { id: "claude", name: "Claude Code", icon: "🤖", configPath: ".claude/", description: "Claude Code project config" },
  { id: "vercel", name: "Vercel v0", icon: "▲", configPath: ".v0/", description: "v0 by Vercel prompt files" },
];

/** Renders the Skills panel — discover, create, and distribute agent skills. */
export function renderSkillsPanel(skills: SkillInfo[]): string {
  const localSkills = skills.filter(s => s.format === "local");
  const importedSkills = skills.filter(s => s.format !== "local");
  const totalCount = skills.length;

  // ── Skill cards ──
  const renderSkillCard = (s: SkillInfo): string => {
    const formatBadge = formatLabel(s.format);
    const statusDot = s.active
      ? '<span style="color:var(--vscode-charts-green)">●</span>'
      : '<span style="color:var(--vscode-charts-red)">○</span>';
    return `
      <div class="skill-card" onclick="openSkill('${s.path}')" title="${s.path}">
        <div class="skill-card-header">
          <div class="skill-card-name">
            ${statusDot}
            <span>${escapeHtml(s.name)}</span>
          </div>
          <span class="skill-format-badge ${s.format}">${formatBadge}</span>
        </div>
        <div class="skill-card-desc">${escapeHtml(s.description || "No description")}</div>
        <div class="skill-card-path"><code>${escapeHtml(s.path)}</code></div>
      </div>`;
  };

  // ── Local skills section ──
  const localSection = localSkills.length > 0
    ? localSkills.map(renderSkillCard).join("")
    : '<div class="empty">No local skills found. Click "Init from Codebase" to scan.</div>';

  // ── Imported skills section ──
  const importedSection = importedSkills.length > 0
    ? importedSkills.map(renderSkillCard).join("")
    : "";

  // ── Agent targets for distribution ──
  const agentButtons = AGENT_TARGETS.map(a => `
    <div class="skill-agent-row" onclick="setupAgentSkills('${a.id}')" title="${a.description}">
      <span class="wf-icon">${a.icon}</span>
      <div class="wf-btn-text">
        <span class="wf-btn-label">${a.name}</span>
        <span class="wf-btn-desc">${escapeHtml(a.configPath)}</span>
      </div>
      <span class="skill-agent-arrow">→</span>
    </div>`).join("");

  return `
  <!-- Init & Actions -->
  <div class="wf-group">
    <div class="wf-group-title">🛠️ Skills <span style="opacity:0.5;font-weight:400">(${totalCount})</span></div>
    <div class="wf-group-body">
      <div style="display:flex;gap:4px">
        <button class="wf-btn primary" onclick="initSkills()" style="flex:1">
          <span class="wf-icon">🔍</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Init from Codebase</span>
            <span class="wf-btn-desc">Scan & discover skill files</span>
          </div>
        </button>
        <button class="wf-btn" onclick="createSkill()" style="flex:1">
          <span class="wf-icon">✨</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Create Skill</span>
            <span class="wf-btn-desc">New SKILL.md from template</span>
          </div>
        </button>
      </div>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button class="wf-btn" onclick="importVercelSkills()" style="flex:1">
          <span class="wf-icon">▲</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Import Vercel</span>
            <span class="wf-btn-desc">Convert v0 prompts to local</span>
          </div>
        </button>
        <button class="wf-btn" onclick="refreshSkills()" style="flex:1">
          <span class="wf-icon">🔄</span>
          <div class="wf-btn-text">
            <span class="wf-btn-label">Refresh</span>
            <span class="wf-btn-desc">Re-scan all sources</span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Local Skills -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('sk-local')" style="cursor:pointer">
      📁 <span style="flex:1">Local Skills <span style="opacity:0.5;font-weight:400">(${localSkills.length})</span></span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible open" id="sk-local">
      <p class="wf-hint">Skills in <code>.agents/skills/</code> — preferred by all agents.</p>
      ${localSection}
    </div>
  </div>

  ${importedSkills.length > 0 ? `
  <!-- Imported / External Skills -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('sk-imported')" style="cursor:pointer">
      🌐 <span style="flex:1">External Skills <span style="opacity:0.5;font-weight:400">(${importedSkills.length})</span></span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="sk-imported">
      <p class="wf-hint">Skills from Cursor rules, Copilot instructions, Vercel v0, etc.</p>
      ${importedSection}
    </div>
  </div>` : ""}

  <!-- Agent Setup -->
  <div class="wf-group">
    <div class="wf-group-title" onclick="toggleSetup('sk-agents')" style="cursor:pointer">
      🤝 <span style="flex:1">Agent Setup</span><span class="chevron" style="font-size:10px">›</span>
    </div>
    <div class="wf-group-body setup-collapsible" id="sk-agents">
      <p class="wf-hint">Distribute local skills to any AI agent's config directory.</p>
      <div class="skill-agent-list">
        ${agentButtons}
      </div>
    </div>
  </div>`;
}

/** Map format IDs to human labels. */
function formatLabel(format: string): string {
  const labels: Record<string, string> = {
    local: "LOCAL",
    vercel: "V0",
    cursor: "CURSOR",
    copilot: "COPILOT",
    claude: "CLAUDE",
  };
  return labels[format] ?? format.toUpperCase();
}

/** Minimal HTML escaper. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
