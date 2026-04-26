# ADR-0001: Use Riverpod for State Management

> Status: accepted
> Date: 2026-01-01
> Deciders: (you)

## Context

The app needs a state management solution that:
- Survives widget rebuilds
- Is testable without spinning up the full widget tree
- Doesn't require passing `BuildContext` everywhere
- Has good documentation for a beginner-friendly project

## Decision

Use `flutter_riverpod` (v2+) as the sole state management library.

- `AsyncNotifierProvider` for stateful collections (todos)
- `Provider` for derived/computed state
- `ConsumerWidget` / `ConsumerStatefulWidget` for UI

## Consequences

### Positive
- Compile-time type safety
- Providers can be read without `BuildContext`
- Testable: `ProviderContainer` lets us override deps cleanly
- Built-in async loading/error states via `AsyncValue`

### Negative / Trade-offs
- Steeper learning curve than `setState`
- Boilerplate for very simple cases

### Neutral
- Adds one direct dependency (`flutter_riverpod`)
- Not using `riverpod_generator` — manual providers only

## Alternatives Considered

- **Provider**: simpler but runtime errors, weaker async
- **BLoC**: too much boilerplate for a todo app
- **Plain setState**: doesn't scale past 1-2 screens

## References

- PRD: `docs/prd/0001-add-todo.md`
- Riverpod docs: https://riverpod.dev
