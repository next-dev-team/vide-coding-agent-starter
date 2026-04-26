# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Aider, etc.) working in this repo.

## Project

A cross-platform Flutter **todo list app**. Local-first (no backend yet). Built as a learning project, so prefer **clarity over cleverness**.

## Tech Stack

| Layer     | Choice                                                    | Why                                              |
| --------- | --------------------------------------------------------- | ------------------------------------------------ |
| Framework | Flutter (stable channel)                                  | Cross-platform                                   |
| Language  | Dart 3+                                                   | Sound null safety, records, patterns             |
| State     | `flutter_riverpod`                                        | Type-safe, testable, no `BuildContext` for reads |
| Storage   | `hive_flutter`                                            | Fast, no SQL, easy for beginners                 |
| Routing   | `go_router`                                               | Declarative, deep-link friendly                  |
| Lints     | `flutter_lints` + custom rules in `analysis_options.yaml` | Catch issues early                               |

Do **not** add new packages without asking. If a task needs one, propose it first with a one-line reason.

## Commands

| Task              | Command                          |
| ----------------- | -------------------------------- |
| Install deps      | `flutter pub get`                |
| Run app           | `flutter run`                    |
| Run tests         | `flutter test`                   |
| Lint/analyze      | `flutter analyze`                |
| Format            | `dart format .`                  |
| Build APK         | `flutter build apk --release`    |
| Codegen (if used) | `dart run build_runner build -d` |

Always run `flutter analyze` and `flutter test` before saying a task is done.

## Project Structure

```
lib/
├── main.dart              # App entry, ProviderScope, theme
├── app.dart               # MaterialApp.router config
├── core/
│   ├── theme/             # Material 3 theme, colors, typography
│   └── router/            # go_router config
├── features/
│   └── todos/
│       ├── data/          # Hive models, repository
│       ├── domain/        # Pure Dart entities (Todo)
│       └── presentation/
│           ├── providers/ # Riverpod providers
│           ├── screens/   # Full pages
│           └── widgets/   # Feature-specific widgets
└── shared/
    └── widgets/           # Reusable widgets across features
test/
└── (mirrors lib/ structure)
docs/
├── prd/                   # Product requirements (what + why)
├── tasks/                 # Task breakdowns (how, scoped)
└── decisions/             # ADRs (why we chose X)
```

One feature = one folder under `features/`. Don't create a feature folder for a single widget.

## Coding Conventions

- **File names**: `snake_case.dart`. Class names: `PascalCase`. Variables: `camelCase`.
- **Private**: prefix with `_` for file-private members.
- **Imports**: package imports first, then relative. Run `dart format .` to sort.
- **Const everywhere possible**: widgets, constructors, lists. The linter enforces this.
- **No `print`**: use `debugPrint` in dev, remove before commit.
- **Widgets**: prefer `StatelessWidget` + Riverpod over `StatefulWidget`. Use `ConsumerWidget` when reading providers.
- **Functions over methods** when the logic doesn't need `this`.
- **Records & patterns** (Dart 3) are encouraged for small data shapes.
- **No business logic in widgets** — push it to providers or repositories.

## Workflow

When the user gives you a **PRD** or **task file**, follow the loop in [`.agents/workflows/feature-loop.md`](.agents/workflows/feature-loop.md).

When making a **non-trivial architectural choice** (new pattern, new package, schema change), write an ADR using [`.agents/templates/adr.md`](.agents/templates/adr.md).

When the user describes a **new feature in chat without a PRD**, offer to draft one first using [`.agents/templates/prd.md`](.agents/templates/prd.md) before writing any code.

Task files in `docs/tasks/` use a status prefix in the filename:

| Prefix     | Meaning                    |
| ---------- | -------------------------- |
| `todo-`    | Not started                |
| `wip-`     | In progress                |
| `done-`    | Completed                  |
| `blocked-` | Blocked, see Notes section |

Rename the file to update status — don't edit a status field inside.

## What to Ask vs Assume

**Ask the user before:**

- Adding any new package
- Changing the state management approach
- Touching `pubspec.yaml` versions
- Deleting files
- Adding a backend or network calls
- Starting a non-trivial task without a PRD

**Assume and proceed when:**

- Creating new widgets/providers that follow existing patterns
- Writing tests for new code
- Fixing lint warnings
- Adding obvious docstrings
- Renaming a task file to update its status

## Skills & References

| Task involves...                               | Read                                 |
| ---------------------------------------------- | ------------------------------------ |
| Working from a PRD or task                     | `.agents/workflows/feature-loop.md`  |
| Writing a task (for yourself or another agent) | `.agents/skills/task-writing.md`     |
| New widget, layout, or UI                      | `.agents/skills/flutter-patterns.md` |
| Providers, state, data flow                    | `.agents/skills/state-management.md` |
| Tests of any kind                              | `.agents/skills/testing.md`          |
| Colors, spacing, typography                    | `.agents/skills/styling.md`          |
| Persisting/loading data                        | `.agents/skills/storage.md`          |
| Writing a PRD                                  | `.agents/templates/prd.md`           |
| Writing a task                                 | `.agents/templates/task.md`          |
| Logging a decision                             | `.agents/templates/adr.md`           |

## Definition of Done

A task is done when:

1. Code compiles (`flutter analyze` clean)
2. Tests pass (`flutter test`)
3. New behavior has at least one test
4. No new lint warnings
5. Public APIs have a one-line dartdoc (`///`)
6. Task file renamed to `done-*.md`
7. Any non-obvious decision logged as an ADR
