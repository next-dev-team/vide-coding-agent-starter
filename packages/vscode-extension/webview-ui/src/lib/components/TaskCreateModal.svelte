<script lang="ts">
  import { getVsCode } from "$lib/vscode";
  import Button from "$lib/components/ui/button.svelte";

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props();
  const vscode = getVsCode();

  let goal = $state("");
  let customSlug = $state("");

  // Auto-generate slug from goal if user hasn't explicitly overridden it
  const slug = $derived(
    customSlug.trim() || 
    goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
  );

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
      onclose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onclose();
  }

  function submit() {
    if (!goal.trim()) return;
    
    vscode.postMessage({ 
      type: "createTaskWithDetails", 
      goal: goal.trim(), 
      slug: slug || "new-task" 
    });
    onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Create new task">
  <div class="modal-container">
    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="modal-header">
      <h2 class="task-title">Create New Task</h2>
      <button class="icon-btn close-btn" onclick={onclose} title="Close">✕</button>
    </header>

    <!-- ── Body ────────────────────────────────────────────── -->
    <div class="modal-body">
      <div class="form-group">
        <label for="task-goal">What does this task achieve? (One sentence)</label>
        <textarea 
          id="task-goal" 
          bind:value={goal} 
          placeholder="e.g., Add input field so users can create todos"
          rows="2"
          autofocus
        ></textarea>
      </div>

      <div class="form-group">
        <label for="task-slug">Filename slug (auto-generated)</label>
        <input 
          id="task-slug" 
          type="text" 
          bind:value={customSlug} 
          placeholder={slug || "add-todo-input"}
        />
        <span class="help-text">Will be saved as <code>docs/tasks/todo-{slug || "add-todo-input"}.md</code></span>
      </div>
    </div>

    <!-- ── Footer ──────────────────────────────────────────── -->
    <footer class="modal-footer">
      <Button variant="ghost" onclick={onclose}>Cancel</Button>
      <Button variant="default" disabled={!goal.trim()} onclick={submit}>Create Task</Button>
    </footer>
  </div>
</div>

<style>
  /* ── Backdrop & Container ──────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: backdrop-in 0.2s ease-out;
  }

  .modal-container {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.4),
      0 0 0 1px color-mix(in srgb, var(--color-border) 30%, transparent);
    animation: modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  /* ── Header ────────────────────────────────────────────── */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 50%, transparent);
  }

  .task-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    color: var(--color-foreground);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--color-muted-foreground);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .close-btn:hover {
    background: var(--color-destructive);
    color: var(--color-destructive-foreground);
  }

  /* ── Body ──────────────────────────────────────────────── */
  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-foreground);
  }

  textarea, input {
    width: 100%;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--vscode-font-family, inherit);
    font-size: 13px;
    transition: border-color 0.15s;
    box-sizing: border-box;
    resize: vertical;
  }

  textarea:focus, input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .help-text {
    font-size: 11px;
    color: var(--color-muted-foreground);
    margin-top: 4px;
  }

  code {
    background: var(--color-muted);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family, monospace);
  }

  /* ── Footer ────────────────────────────────────────────── */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-muted) 25%, transparent);
  }

  /* ── Animations ────────────────────────────────────────── */
  @keyframes backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
