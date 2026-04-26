# PRD-0001: Add a Todo

> Status: draft
> Owner: (you)
> Created: 2026-01-01

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
- [ ] Submitting an empty or whitespace-only title is a no-op
- [ ] After a successful add, the input clears and refocuses
- [ ] The todo list scrolls so the newest entry is visible
- [ ] Unit tests cover the notifier's `add` method
- [ ] Widget test verifies the input → tap → list update flow

## Out of Scope

- Editing an existing todo
- Due dates, priority, tags
- Multi-line input
- Voice input

## Open Questions

- (none — this is intentionally simple)

## References

- Tasks: `docs/tasks/todo-0001-add-todo-input.md`

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-0001-add-todo-input.md`
