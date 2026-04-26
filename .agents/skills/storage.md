# Storage (Hive)

Local persistence. Hive is fast, NoSQL, no migrations to write by hand.

## Setup (one-time, in `main.dart`)

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  Hive.registerAdapter(TodoAdapter()); // generated
  await Hive.openBox<Todo>('todos');
  runApp(const ProviderScope(child: App()));
}
```

## Domain Entity (annotated)

```dart
// lib/features/todos/domain/todo.dart
import 'package:hive/hive.dart';
part 'todo.g.dart';

@HiveType(typeId: 0)
class Todo {
  Todo({required this.id, required this.title, required this.done});

  @HiveField(0) final String id;
  @HiveField(1) final String title;
  @HiveField(2) final bool done;

  Todo copyWith({String? title, bool? done}) =>
      Todo(id: id, title: title ?? this.title, done: done ?? this.done);
}
```

Run `dart run build_runner build -d` to generate `todo.g.dart`.

## Repository

```dart
// lib/features/todos/data/todo_repository.dart
abstract interface class TodoRepository {
  Future<List<Todo>> getAll();
  Future<void> save(Todo todo);
  Future<void> delete(String id);
}

class HiveTodoRepository implements TodoRepository {
  HiveTodoRepository(this._box);
  final Box<Todo> _box;

  @override
  Future<List<Todo>> getAll() async => _box.values.toList();

  @override
  Future<void> save(Todo t) => _box.put(t.id, t);

  @override
  Future<void> delete(String id) => _box.delete(id);
}

final todoRepositoryProvider = Provider<TodoRepository>((ref) {
  return HiveTodoRepository(Hive.box<Todo>('todos'));
});
```

## Rules

- **One box per entity type.** Don't mix todos and settings in the same box.
- **Always type your boxes:** `Box<Todo>`, never `Box`.
- **Repository is the only thing that talks to Hive.** Notifiers depend on the repository, not on Hive directly.
- **Never expose `Box` from a provider** — expose the repository interface.

## Adding a New Field to an Entity

1. Add the field with a new `@HiveField(N)` index — **never reuse old indexes**.
2. Make it nullable or give it a default to keep old data readable.
3. Re-run `build_runner`.

```dart
@HiveField(3) final DateTime? createdAt; // new field, nullable
```

## Don'ts

- ❌ Don't put Hive imports in the `domain/` layer's pure logic — only on entity files.
- ❌ Don't reuse `@HiveField` index numbers when removing fields. Mark removed ones with a comment: `// @HiveField(2) - removed in v2`.
- ❌ Don't open boxes lazily inside repository methods — open once in `main`.
