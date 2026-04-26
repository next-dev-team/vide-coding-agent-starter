# PRD-0001: Add a Todo

> Status: approved
> Owner: zila
> Created: 2026-04-26

## Problem

The app has no way for users to capture new todos. Without an input mechanism, the list is permanently empty and the app does nothing.

## Users

Every user, every session — this is the most fundamental interaction.

## User Stories

- As a **user**, I want to **type a title and tap "Add"**, so that **the todo appears in my list**.
- As a **user**, I want **my new todo to survive an app restart**, so that **I don't lose my list**.
- As a **user**, I want **empty submissions to be rejected**, so that **I don't end up with blank entries**.

## Acceptance Criteria

- [ ] A `TextField` and "Add" button are visible on the todos screen
- [ ] Submitting a non-empty title appends a todo to the list
- [ ] The new todo persists across app restarts (Hive)
- [ ] Submitting an empty or whitespace-only title is a no-op (no todo added, no error toast)
- [ ] After a successful add, the input clears and refocuses
- [ ] The todo list scrolls so the newest entry is visible
- [ ] Unit tests cover the notifier's `add` method (happy path + empty rejection)
- [ ] Widget test verifies the input → tap → list update flow

## Out of Scope

- Editing an existing todo (separate PRD)
- Due dates, priority, tags
- Multi-line input
- Voice input
- Character limits

## Open Questions

- Q1: Should we show a snackbar confirming the add? **Resolved:** No — the visible list update is enough feedback.
- Q2: Should the input be at the top or bottom of the screen? **Resolved:** Bottom, with FAB-style affordance.

## References

- Tasks: `docs/tasks/done-0001-add-todo-input.md`
- ADRs: `docs/decisions/0001-use-riverpod.md`

---

**Tasks generated from this PRD:**
- [x] `docs/tasks/done-0001-add-todo-input.md`
