# PRD-0001: Add Todo

> Status: draft
> Owner: (you)
> Created: 2026-01-01

## Problem

The app needs the ability to create, view, and manage todo items. Without this, the app has no core functionality.

## Users

Any user who opens the app for the first time.

## User Stories

- As a **user**, I want to **type a todo and press Enter**, so that **it appears in my list**.
- As a **user**, I want to **check off a todo**, so that **I know it's done**.
- As a **user**, I want to **delete a todo**, so that **I can remove mistakes**.
- As a **user**, I want to **see my todos after refresh**, so that **nothing is lost**.

## Acceptance Criteria

- [ ] Text input at the top of the screen
- [ ] Pressing Enter or tapping "Add" creates a todo
- [ ] Each todo has a checkbox to toggle done/not-done
- [ ] Each todo has a delete button
- [ ] Todos persist in localStorage across page refreshes
- [ ] Empty input does not create a todo

## Out of Scope

- Editing todo text after creation
- Due dates, categories, or priorities
- Backend sync
- Multi-user

## Open Questions

- (none — this is intentionally simple)

## References

- Linked tasks: `docs/tasks/todo-0001-add-todo-input.md`

---

**Tasks generated from this PRD:**
- [ ] `docs/tasks/todo-0001-add-todo-input.md`
