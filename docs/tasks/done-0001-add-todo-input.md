# Task 0001: Add Todo Input

> PRD: `docs/prd/0001-add-todo.md`
> Created: 2026-04-26

## Goal

Implement the input UI and `add` method so users can create todos that persist.

## Acceptance Criteria

- [x] `TodoInput` widget exists at `lib/features/todos/presentation/widgets/todo_input.dart`
- [x] Input is rendered on `TodosScreen` at the bottom
- [x] `TodosNotifier.add(String title)` is implemented and persists to Hive
- [x] Empty/whitespace title → no-op (early return after `.trim()`)
- [x] Input clears + refocuses after successful add
- [x] List scrolls to show the new item
- [x] Test: `todos_notifier_test.dart` covers add happy path + empty rejection
- [x] Test: `todo_input_test.dart` widget test for the input flow
- [x] All tests pass (`flutter test`)
- [x] Analyzer clean (`flutter analyze`)

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

- Decided to scroll via `ScrollController.animateTo(maxExtent)` rather than `ensureVisible` — simpler since we always want to jump to the new last item.
- Caught a subtle issue: `state = AsyncData([...?state.value, todo])` was overwriting in-flight Hive saves. Fixed by awaiting the save before updating state.
- This whole task took ~45 min including tests.

## When Done

- [x] Rename file from `wip-` to `done-`
- [x] Tick all PRD acceptance criteria this task contributes to
- [x] No ADR needed — no novel decisions
