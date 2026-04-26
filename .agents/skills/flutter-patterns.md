# Flutter Patterns

Rules for building widgets in this app.

## Widget Type Decision

| Need... | Use |
|---|---|
| No state, no provider reads | `StatelessWidget` |
| Reads providers, no local state | `ConsumerWidget` |
| Reads providers + has local state (controllers, focus) | `ConsumerStatefulWidget` |
| Local state only, no providers | `StatefulWidget` |

**Default to `ConsumerWidget`.** Reach for stateful only when you genuinely need `initState`, `dispose`, or local mutable state like a `TextEditingController`.

## Composition Rules

- One widget per file when it's >30 lines or used outside its parent.
- Inline private widgets (`class _RowItem extends StatelessWidget`) for small sub-widgets only used once.
- **No build methods over ~50 lines.** Extract sub-widgets.
- Pass data **down** via constructors. Pass actions **up** via callbacks or providers — never both directions through the same widget.

## Constructor Style

```dart
class TodoTile extends StatelessWidget {
  const TodoTile({
    super.key,
    required this.todo,
    this.onToggle,
  });

  final Todo todo;
  final VoidCallback? onToggle;

  @override
  Widget build(BuildContext context) { ... }
}
```

- Always `const` constructor when possible.
- `super.key` first, then required fields, then optional.
- Fields are `final` and below the constructor.

## Common Patterns for This App

### A list screen
```dart
class TodosScreen extends ConsumerWidget {
  const TodosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todos = ref.watch(todosProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Todos')),
      body: todos.when(
        data: (items) => _TodoList(items: items),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddDialog(context, ref),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### A list item with action
```dart
class TodoTile extends ConsumerWidget {
  const TodoTile({super.key, required this.todo});
  final Todo todo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CheckboxListTile(
      value: todo.done,
      title: Text(todo.title),
      onChanged: (_) => ref.read(todosProvider.notifier).toggle(todo.id),
    );
  }
}
```

## Don'ts

- ❌ Don't put `setState` in a `ConsumerWidget` — convert to `ConsumerStatefulWidget`.
- ❌ Don't read providers inside `build` with `ref.read` — use `ref.watch`.
- ❌ Don't pass `BuildContext` into provider methods.
- ❌ Don't use `MediaQuery.of(context).size` for responsive layout — use `LayoutBuilder` or `Flexible`/`Expanded`.
- ❌ Don't hardcode colors or sizes — use theme tokens (see `styling.md`).
