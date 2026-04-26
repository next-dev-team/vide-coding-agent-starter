# Testing

Every new feature gets at least one test. Use the right kind for the job.

## Test Types

| Kind | When | Folder |
|---|---|---|
| Unit | Pure logic, notifiers, repositories | `test/` (mirrors `lib/`) |
| Widget | A single widget renders + reacts | `test/` |
| Integration | Full user flow on a real device/sim | `integration_test/` |

Default to **unit + widget**. Skip integration tests unless the user asks.

## Naming

```dart
group('TodosNotifier', () {
  test('adds a todo', () { ... });
  test('toggles done state', () { ... });
  test('removes by id', () { ... });
});
```

- One `group` per class/widget.
- Test names: present tense, describe the behavior, no `should`.

## Unit Test — Notifier with Mock Repo

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class _FakeRepo implements TodoRepository {
  final List<Todo> _store = [];
  @override Future<List<Todo>> getAll() async => List.of(_store);
  @override Future<void> save(Todo t) async {
    _store.removeWhere((x) => x.id == t.id);
    _store.add(t);
  }
  @override Future<void> delete(String id) async {
    _store.removeWhere((t) => t.id == id);
  }
}

void main() {
  group('TodosNotifier', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer(overrides: [
        todoRepositoryProvider.overrideWithValue(_FakeRepo()),
      ]);
      addTearDown(container.dispose);
    });

    test('starts empty', () async {
      final todos = await container.read(todosProvider.future);
      expect(todos, isEmpty);
    });

    test('adds a todo', () async {
      await container.read(todosProvider.future);
      await container.read(todosProvider.notifier).add('Buy milk');
      final todos = container.read(todosProvider).value!;
      expect(todos, hasLength(1));
      expect(todos.first.title, 'Buy milk');
    });
  });
}
```

## Widget Test

```dart
testWidgets('TodoTile shows title and toggles on tap', (tester) async {
  final todo = Todo(id: '1', title: 'Buy milk', done: false);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        todoRepositoryProvider.overrideWithValue(_FakeRepo()),
      ],
      child: MaterialApp(home: Scaffold(body: TodoTile(todo: todo))),
    ),
  );

  expect(find.text('Buy milk'), findsOneWidget);
  await tester.tap(find.byType(Checkbox));
  await tester.pump();
  // assert state changed via the provider
});
```

## Mocking Rules

- Prefer **fakes** (hand-written `_FakeRepo`) over mock libraries for this project. Easier to read.
- Override providers via `ProviderContainer(overrides: [...])` for unit tests.
- Override via `ProviderScope(overrides: [...])` for widget tests.

## Coverage Goals

- 100% on notifiers (they hold the logic).
- Smoke test for every screen widget.
- Don't chase coverage on pure UI scaffolding.

## Running

```bash
flutter test                          # all tests
flutter test test/features/todos/     # one folder
flutter test --coverage               # with coverage
```

## Don'ts

- ❌ Don't test private methods directly — test through the public API.
- ❌ Don't use real Hive in unit tests — use a fake repo.
- ❌ Don't use `Future.delayed` to "wait" — use `pumpAndSettle` or `await` the future.
