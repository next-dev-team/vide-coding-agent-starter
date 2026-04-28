<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import type { SkillInfo } from "$lib/types";

  let { skills = [] } = $props<{ skills: SkillInfo[] }>();
  const vscode = getVsCode<{}>();

  let localSkills = $derived(skills.filter((s) => s.format === "local"));
  let importedSkills = $derived(skills.filter((s) => s.format !== "local"));

  function initSkills() { vscode.postMessage({ type: "initSkills" }); }
  function createSkill() { vscode.postMessage({ type: "createSkill" }); }
  function importVercelSkills() { vscode.postMessage({ type: "importVercelSkills" }); }
  function refreshSkills() { vscode.postMessage({ type: "refreshSkills" }); }
  function openSkill(path: string) { vscode.postMessage({ type: "openSkill", path }); }
  function setupAgentSkills(agent: string) { vscode.postMessage({ type: "setupAgentSkills", agent }); }

  const AGENT_TARGETS = [
    { id: "local", name: "Local", icon: "📁", desc: ".agents/skills/" },
    { id: "copilot", name: "Copilot", icon: "💎", desc: ".github/" },
    { id: "cursor", name: "Cursor", icon: "⚡", desc: ".cursor/rules/" },
    { id: "antigravity", name: "Antigravity", icon: "🚀", desc: "~/.gemini/" },
    { id: "claude", name: "Claude", icon: "🤖", desc: ".claude/" },
    { id: "vercel", name: "v0", icon: "▲", desc: ".v0/" },
  ];

  const FORMAT_COLORS: Record<string, string> = {
    local: "var(--color-status-done)",
    cursor: "var(--color-status-wip)",
    copilot: "var(--color-status-todo)",
    claude: "var(--color-status-verified)",
    vercel: "var(--color-foreground)",
  };
</script>

<div class="skills-root">
  <!-- Action bar -->
  <div class="action-bar">
    <button class="action-btn primary" onclick={initSkills}>
      <span class="action-icon">🔍</span>
      <span>Scan</span>
    </button>
    <button class="action-btn" onclick={createSkill}>
      <span class="action-icon">✨</span>
      <span>New</span>
    </button>
    <button class="action-btn" onclick={importVercelSkills}>
      <span class="action-icon">▲</span>
      <span>Import</span>
    </button>
    <button class="action-btn" onclick={refreshSkills}>
      <span class="action-icon">↻</span>
    </button>
  </div>

  <!-- Skills list -->
  {#if skills.length === 0}
    <div class="empty-state">
      <span class="empty-emoji">⚙️</span>
      <span class="empty-title">No skills discovered</span>
      <span class="empty-hint">Click <strong>Scan</strong> to find SKILL.md files</span>
    </div>
  {:else}
    <!-- Local -->
    {#if localSkills.length > 0}
      <div class="section-header">
        <span>📁 Local</span>
        <span class="section-count">{localSkills.length}</span>
      </div>
      <div class="skill-list" style="animation: var(--animate-fade-in)">
        {#each localSkills as skill}
          <button class="skill-card" onclick={() => openSkill(skill.path)}>
            <div class="skill-status" style:color={skill.active ? "var(--color-status-done)" : "var(--color-status-blocked)"}>
              {skill.active ? "●" : "○"}
            </div>
            <div class="skill-body">
              <div class="skill-name">{skill.name}</div>
              <div class="skill-desc">{skill.description || "No description"}</div>
            </div>
            <span class="format-tag" style:color={FORMAT_COLORS[skill.format] || "inherit"}>{skill.format.toUpperCase()}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Imported -->
    {#if importedSkills.length > 0}
      <div class="section-header">
        <span>🌐 External</span>
        <span class="section-count">{importedSkills.length}</span>
      </div>
      <div class="skill-list" style="animation: var(--animate-fade-in)">
        {#each importedSkills as skill}
          <button class="skill-card" onclick={() => openSkill(skill.path)}>
            <div class="skill-status" style:color={skill.active ? "var(--color-status-done)" : "var(--color-status-blocked)"}>
              {skill.active ? "●" : "○"}
            </div>
            <div class="skill-body">
              <div class="skill-name">{skill.name}</div>
              <div class="skill-desc">{skill.description || "No description"}</div>
            </div>
            <span class="format-tag" style:color={FORMAT_COLORS[skill.format] || "inherit"}>{skill.format.toUpperCase()}</span>
          </button>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- Distribute -->
  <div class="section-header" style="margin-top: 8px">
    <span>🤝 Distribute to Agents</span>
  </div>
  <div class="agent-grid">
    {#each AGENT_TARGETS as target}
      <button class="agent-chip" onclick={() => setupAgentSkills(target.id)} title={target.desc}>
        <span class="agent-icon">{target.icon}</span>
        <span class="agent-name">{target.name}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .skills-root {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* ── Action bar ───────────────────────────────────────── */
  .action-bar {
    display: flex;
    gap: 4px;
  }
  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 0;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-card);
    color: var(--color-foreground);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
  }
  .action-btn:hover {
    background: var(--color-accent);
    border-color: var(--color-ring);
  }
  .action-btn.primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-color: var(--color-primary);
  }
  .action-btn.primary:hover { opacity: 0.9; }
  .action-icon { font-size: 12px; }

  /* ── Section header ───────────────────────────────────── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 2px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted-foreground);
  }
  .section-count {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 99px;
    background: var(--color-muted);
    font-size: 9px;
    line-height: 16px;
    text-align: center;
  }

  /* ── Skill list ───────────────────────────────────────── */
  .skill-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .skill-card {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.12s ease;
    text-align: left;
    font-family: inherit;
    color: inherit;
  }
  .skill-card:hover {
    border-color: var(--color-ring);
    box-shadow: 0 1px 6px color-mix(in srgb, var(--color-ring) 12%, transparent);
  }

  .skill-status { font-size: 10px; padding-top: 2px; }

  .skill-body {
    flex: 1;
    min-width: 0;
  }
  .skill-name {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
  }
  .skill-desc {
    font-size: 10px;
    color: var(--color-muted-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
  }

  .format-tag {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.05em;
    padding: 1px 5px;
    border-radius: 4px;
    background: color-mix(in srgb, currentColor 10%, transparent);
    white-space: nowrap;
  }

  /* ── Agent grid ───────────────────────────────────────── */
  .agent-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  .agent-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-card);
    cursor: pointer;
    transition: all 0.12s ease;
    font-family: inherit;
    color: inherit;
  }
  .agent-chip:hover {
    border-color: var(--color-ring);
    background: var(--color-accent);
  }
  .agent-icon { font-size: 16px; }
  .agent-name { font-size: 9px; font-weight: 600; }

  /* ── Empty state ──────────────────────────────────────── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 16px;
    gap: 6px;
    color: var(--color-muted-foreground);
  }
  .empty-emoji { font-size: 28px; opacity: 0.4; }
  .empty-title { font-size: 12px; font-weight: 600; }
  .empty-hint { font-size: 10px; opacity: 0.6; text-align: center; }
</style>
