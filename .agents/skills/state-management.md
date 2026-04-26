# Skill: State Management (Riverpod)

This app uses `flutter_riverpod`. Read this before adding or modifying any provider.

## Provider Types — When to Use Which

| Type | Use for |
|---|---|
| `Provider` | Pure values, derived state (computed from other providers) |
| `FutureProvider` | One-shot async load (e.g., reading from Hive at startup) |
| `StreamProvider` | Streams (e.g., reactive Hive box listeners) |
| `NotifierProvider` | Synchronous mutable state (todo list, filters) |
| `AsyncNotifierProvider` | Async mutable state (todo list backed by storage) |

**Default for this app:** `AsyncNotifierProvider` for the todo list (since it loads from Hive), `Provider` for derived state like filtered/counted lists.

## File Layout

One provider per file in `presentation/providers/`:
```
providers/
├── todos_provider.dart      # the AsyncNotifier
├── todo_filter_provider.dart # filter enum state
└── filtered_todos_provider.dart # derived list
```

## Canonical Notifier Pattern

```dart
// todos_provider.dart
final todosProvider =
    AsyncNotifierProvider<TodosNotifier, List<Todo>>(TodosNotifier.new);

class TodosNotifier extends AsyncNotifier<List<Todo>> {
  late final TodoRepository _repo;

  @override
  Future<List<Todo>> build() async {
    _repo = ref.read(todoRepositoryProvider);
    return _repo.getAll();
  }

  Future<void> add(String title) async {
    final todo = Todo(id: _newId(), title: title, done: false);
    await _repo.save(todo);
    state = AsyncData([...?state.value, todo]);
  }

  Future<void> toggle(String id) async {
    final current = state.value ?? [];
    final updated = current.map((t) =>
      t.id == id ? t.copyWith(done: !t.done) : t
    ).toList();
    state = AsyncData(updated);
    await _repo.save(updated.firstWhere((t) => t.id == id));
  }

  Future<void> remove(String id) async {
    state = AsyncData((state.value ?? []).where((t) => t.id != id).toList());
    await _repo.delete(id);
  }
}
```

## Derived State

Don't recompute filtered lists in widgets. Make a provider:

```dart
final filteredTodosProvider = Provider<List<Todo>>((ref) {
  final todos = ref.watch(todosProvider).value ?? [];
  final filter = ref.watch(todoFilterProvider);
  return switch (filter) {
    TodoFilter.all => todos,
    TodoFilter.active => todos.where((t) => !t.done).toList(),
    TodoFilter.done => todos.where((t) => t.done).toList(),
  };
});
```

## Reading Providers in Widgets

| Where | Use |
|---|---|
| In `build()` | `ref.watch(provider)` |
| In callbacks (onTap, onPressed) | `ref.read(provider.notifier).method()` |
| To listen for side effects (snackbars, navigation) | `ref.listen(provider, (prev, next) {...})` |

**Never** call `ref.read` for state you display — it won't rebuild on changes.

## Adding a New Feature — Recipe

1. Define the entity in `domain/`.
2. Add repository methods in `data/`.
3. Create the notifier provider in `presentation/providers/`.
4. Build the UI as `ConsumerWidget` and `ref.watch` the provider.
5. Write tests for the notifier (see `testing.md`).

## Don'ts

- ❌ Don't store `BuildContext` in a notifier.
- ❌ Don't call `ref.read` inside `build` — use `ref.watch`.
- ❌ Don't mutate state directly (`state.value!.add(...)`) — always assign a new list.
- ❌ Don't put UI strings (snackbar text, dialog titles) in notifiers.
