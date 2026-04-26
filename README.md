# Todo

A simple, local-first todo list app built with Flutter. Cross-platform (iOS, Android, desktop, web).

> Learning project — built collaboratively with AI coding agents. See [`AGENTS.md`](AGENTS.md) for the agent playbook.

## Stack

| | |
|---|---|
| Framework | Flutter (stable) |
| Language | Dart 3+ |
| State | flutter_riverpod |
| Storage | hive_flutter |
| Routing | go_router |
| UI | Material 3 |

## Quick Start

```bash
# Install Flutter SDK first: https://docs.flutter.dev/get-started/install

git clone <repo-url>
cd todo
flutter pub get
flutter run
```

## Common Commands

| Task | Command |
|---|---|
| Run app | `flutter run` |
| Run tests | `flutter test` |
| Analyze | `flutter analyze` |
| Format | `dart format .` |
| Build APK | `flutter build apk --release` |
| Codegen (Hive adapters) | `dart run build_runner build -d` |

## Project Structure

```
lib/
├── main.dart            # entry, ProviderScope, theme
├── app.dart             # MaterialApp.router
├── core/                # theme, router
├── features/todos/      # the one feature for now
│   ├── data/            # Hive repository
│   ├── domain/          # Todo entity
│   └── presentation/    # screens, widgets, providers
└── shared/              # cross-feature widgets

test/                    # mirrors lib/
docs/                    # PRDs, tasks, ADRs
.agents/                 # AI agent playbook
```

## Development Loop

1. **Idea** → write a PRD in `docs/prd/` ([template](.agents/templates/prd.md))
2. **PRD** → break into tasks in `docs/tasks/` ([template](.agents/templates/task.md))
3. **Task** → hand to an agent (or yourself) — code + tests
4. **Decision** → log non-trivial choices as ADRs in `docs/decisions/` ([template](.agents/templates/adr.md))
5. **Done** → rename `wip-NNNN-...md` to `done-NNNN-...md`

Full process: [`.agents/workflows/feature-loop.md`](.agents/workflows/feature-loop.md).

## Working with AI Agents

Drop this repo into Claude Code, Cursor, Aider, or any agent that reads `AGENTS.md`. The agent gets:

- Stack + conventions ([`AGENTS.md`](AGENTS.md))
- Patterns for widgets, state, tests, theming, storage ([`.agents/skills/`](.agents/skills/))
- Templates for PRDs, tasks, ADRs ([`.agents/templates/`](.agents/templates/))
- Worked examples ([`docs/`](docs/))

## Status

Early development. See [`docs/tasks/`](docs/tasks/) for current work.

## License

MIT
