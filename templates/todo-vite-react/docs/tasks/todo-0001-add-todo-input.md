# Task 0001: Add Todo Input

> PRD: `docs/prd/0001-add-todo.md`
> Created: 2026-01-01

## Goal

Add a text input field and submit button so users can create new todos.

## Acceptance Criteria

- [ ] Text input renders at the top of the page
- [ ] Typing text and pressing Enter creates a new todo item
- [ ] Clicking "Add" button creates a new todo item
- [ ] Input clears after successful submission
- [ ] Empty input does not create a todo
- [ ] New todo appears in the list immediately

## Files Likely Affected

- `src/App.tsx` — add input form
- `src/hooks/useTodos.ts` — addTodo function
- `src/index.css` — input styling

## Approach

- Add a controlled input with `useState`
- Wire form `onSubmit` to call `addTodo` from the hook
- Focus the input on mount with `useRef` + `useEffect`

## Open Questions

- (none)

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
