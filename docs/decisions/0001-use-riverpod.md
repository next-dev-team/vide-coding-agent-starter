# ADR-0001: Use Riverpod for State Management

> Status: accepted
> Date: 2026-04-26
> Deciders: zila

## Context

The app needs a state management solution that:
- Survives widget rebuilds
- Is testable without spinning up the full widget tree
- Doesn't require passing `BuildContext` everywhere
- Has good documentation for a beginner-friendly project
- Plays well with async data sources (Hive)

The project is a learning vehicle, so we also weight **type safety** and **clear failure modes** over absolute minimalism.

## Decision

Use `flutter_riverpod` (v2+) as the sole state management library.

- `AsyncNotifierProvider` for stateful collections (todos)
- `Provider` for derived/computed state
- `ConsumerWidget` / `ConsumerStatefulWidget` for UI

## Consequences

### Positive
- Compile-time type safety — no runtime "provider not found" errors
- Providers can be read without `BuildContext` (e.g. inside other providers)
- Testable: `ProviderContainer` lets us override deps cleanly
- Built-in support for async loading/error states via `AsyncValue`

### Negative / Trade-offs
- Steeper learning curve than `setState` or `Provider` for absolute beginners
- Boilerplate for very simple cases (e.g. a single counter feels heavy)
- Two different `ref` APIs (`ref.watch` vs `ref.read`) — easy to confuse early on

### Neutral
- Adds one direct dependency (`flutter_riverpod`) plus its transitives
- We're not using `riverpod_generator` — manually written providers only, to keep build steps minimal

## Alternatives Considered

### Option A: Provider (the original)
- Pros: simpler API, official Flutter team blessing
- Cons: requires `BuildContext`, runtime errors for missing providers, weaker async story
- Why rejected: type safety and testability matter more than the slightly simpler API

### Option B: BLoC (flutter_bloc)
- Pros: very explicit, well-tested, widely used in industry
- Cons: heavy boilerplate (event + state classes per feature), overkill for a todo app
- Why rejected: ceremony-to-value ratio is wrong for a learning project

### Option C: Plain `setState` + `InheritedWidget`
- Pros: zero dependencies
- Cons: doesn't scale past 1–2 screens; manual plumbing
- Why rejected: we'll outgrow it within a week

### Option D: signals (`signals_flutter`)
- Pros: very lightweight, fine-grained reactivity
- Cons: smaller community, fewer learning resources, less mature
- Why rejected: prioritize ecosystem maturity for a learning project

## References

- PRD: `docs/prd/0001-add-todo.md`
- Riverpod docs: https://riverpod.dev
