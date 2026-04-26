# Task 0001: Add Todo Input

> PRD: `docs/prd/0001-add-todo.md`
> Created: 2026-04-26

## Goal

Implement the input UI and `add` method so users can create todos that persist.

## Acceptance Criteria

- [ ] `TodoInput` widget exists at `lib/features/todos/presentation/widgets/todo_input.dart`
- [ ] Input is rendered on `TodosScreen` at the bottom
- [ ] `TodosNotifier.add(String title)` is implemented and persists to Hive
- [ ] Empty/whitespace title → no-op (early return after `.trim()`)
- [ ] Input clears + refocuses after successful add
- [ ] List scrolls to show the new item
- [ ] Test: `todos_notifier_test.dart` covers add happy path + empty rejection
- [ ] Test: `todo_input_test.dart` widget test for the input flow
- [ ] All tests pass (`flutter test`)
- [ ] Analyzer clean (`flutter analyze`)

## Files Likely Affected

- `lib/features/todos/presentation/widgets/todo_input.dart` — new
- `lib/features/todos/presentation/screens/todos_screen.dart` — edit
- `lib/features/todos/presentation/providers/todos_provider.dart` — edit (add method)
- `test/features/todos/presentation/providers/todos_notifier_test.dart` — new
- `test/features/todos/presentation/widgets/todo_input_test.dart` — new

## Approach

- Use a `ConsumerStatefulWidget` for `TodoInput` (needs `TextEditingController` + `FocusNode`)
- On submit: trim, early return if empty, call `ref.read(todosProvider.notifier).add(...)`
- Use `Scrollable.ensureVisible` or scroll controller after add
- Mock `TodoRepository` with a fake list-backed impl in tests

## Open Questions

(none — resolved during PRD review)

## Notes

(empty until implementation)

## When Done

- [ ] Rename file from `wip-` to `done-`
- [ ] Tick all PRD acceptance criteria this task contributes to
- [ ] Write ADR if a non-trivial decision was made
