# On Task Done

**Auto-triggered when a task moves to DONE.**

Before marking complete, verify:

1. **All acceptance criteria checked** — every `- [ ]` should be `- [x]`
2. **Build passes** — run `pnpm build` (or project equivalent) with zero errors
3. **Tests pass** — run `pnpm test` with all tests green
4. **New code has tests** — at least one test covers the new behavior
5. **No TypeScript errors** — clean type-check
6. **Run drift check** — call `task_drift_check` to verify no unexpected scope creep
7. **Security review** — read `kanban://review/security` and check against changes
8. **Performance review** — read `kanban://review/performance` and check against changes
9. **Extract learnings** — call `compound_learnings` to persist knowledge

> This hook runs automatically. The agent should verify all items before completing the task.
