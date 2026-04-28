<script lang="ts">
  // i18n Tab — Coming Soon placeholder
</script>

<div class="i18n-root">
  <div class="coming-soon-card">
    <div class="cs-glow"></div>
    <div class="cs-icon">🌍</div>
    <h3 class="cs-title">Internationalization</h3>
    <p class="cs-subtitle">Coming Soon</p>
    <div class="cs-divider"></div>
    <p class="cs-desc">
      Multi-language support for your projects — manage translations, detect missing keys, and sync locales directly from the Kanban sidebar.
    </p>
    <ul class="cs-features">
      <li>
        <span class="cs-feat-icon">📦</span>
        <div class="cs-feat-body">
          <span class="cs-feat-name">Translation Manager</span>
          <span class="cs-feat-desc">Visual editor for JSON/YAML locale files</span>
        </div>
      </li>
      <li>
        <span class="cs-feat-icon">🔍</span>
        <div class="cs-feat-body">
          <span class="cs-feat-name">Missing Key Detection</span>
          <span class="cs-feat-desc">Scan codebase for untranslated strings</span>
        </div>
      </li>
      <li>
        <span class="cs-feat-icon">🤖</span>
        <div class="cs-feat-body">
          <span class="cs-feat-name">AI Translation</span>
          <span class="cs-feat-desc">Auto-translate via agent MCP tools</span>
        </div>
      </li>
      <li>
        <span class="cs-feat-icon">🔄</span>
        <div class="cs-feat-body">
          <span class="cs-feat-name">Locale Sync</span>
          <span class="cs-feat-desc">Keep all language files in sync</span>
        </div>
      </li>
      <li>
        <span class="cs-feat-icon">📊</span>
        <div class="cs-feat-body">
          <span class="cs-feat-name">Coverage Dashboard</span>
          <span class="cs-feat-desc">Track translation progress per locale</span>
        </div>
      </li>
    </ul>
    <div class="cs-badge">
      <span class="cs-badge-dot"></span>
      In Development
    </div>
  </div>
</div>

<style>
  .i18n-root {
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100%;
  }

  .coming-soon-card {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px 20px 20px;
    border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--color-card) 90%, transparent);
    overflow: hidden;
    text-align: center;
  }

  /* Glow accent behind the icon */
  .cs-glow {
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--color-primary) 20%, transparent) 0%,
      transparent 70%
    );
    pointer-events: none;
    animation: glow-pulse 3s ease-in-out infinite;
  }

  .cs-icon {
    position: relative;
    font-size: 36px;
    line-height: 1;
    animation: float 4s ease-in-out infinite;
  }

  .cs-title {
    position: relative;
    font-size: 16px;
    font-weight: 800;
    margin: 0;
    color: var(--color-foreground);
    letter-spacing: -0.01em;
  }

  .cs-subtitle {
    position: relative;
    font-size: 12px;
    font-weight: 700;
    margin: 0;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .cs-divider {
    width: 40px;
    height: 2px;
    border-radius: 99px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-primary),
      transparent
    );
    margin: 4px 0;
  }

  .cs-desc {
    position: relative;
    font-size: 11px;
    line-height: 1.5;
    color: var(--color-muted-foreground);
    margin: 0;
    max-width: 260px;
  }

  /* ── Feature list ────────────────────────────────────────── */
  .cs-features {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cs-features li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--color-muted) 30%, transparent);
    text-align: left;
    transition: background 0.12s ease;
  }
  .cs-features li:hover {
    background: var(--color-accent);
  }

  .cs-feat-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .cs-feat-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .cs-feat-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-foreground);
  }

  .cs-feat-desc {
    font-size: 9px;
    color: var(--color-muted-foreground);
  }

  /* ── Badge ───────────────────────────────────────────────── */
  .cs-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 4px 12px;
    border-radius: 99px;
    background: color-mix(in srgb, var(--color-status-wip) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-status-wip) 25%, transparent);
    color: var(--color-status-wip);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .cs-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-status-wip);
    animation: dot-pulse 2s ease-in-out infinite;
  }

  /* ── Animations ──────────────────────────────────────────── */
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes glow-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  @keyframes dot-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
</style>
