# Test Cases

First-class, persistent test artifacts — modeled on Jira/Xray. Test cases describe **what to verify**; tickets describe **what to build**. They're linked, not embedded.

## Why a separate folder?

- **Stable IDs** (`TC-0001`) outlive any ticket — even after `tasks/` archives to `done/`.
- **Discoverable** — one place to find every test for a feature.
- **Linkable** — PRDs and tasks reference TC-IDs; drift detection can flag stale links.

## Layout

| Path                          | Contents                                              |
| ----------------------------- | ----------------------------------------------------- |
| `docs/test-cases/`            | Test case files, one per case (`TC-NNNN-slug.md`)    |
| `docs/test-cases/README.md`   | This index + conventions                              |
| `docs/test-runs/`             | (optional) Execution cycles — records of runs        |

## Naming

- **Zero-padded sequential IDs**: `TC-0001`, `TC-0002`, …
- **Filename**: `TC-NNNN-slug.md` (slug describes the case)
- IDs are **never reused**. If a case is retired, set `status: deprecated` in frontmatter — keep the file.

## Frontmatter Fields

```yaml
id: TC-0001
title: Intent interview captures user goal
component: intent-interview      # feature/area name
priority: high                   # high | medium | low
type: manual                     # manual | automated
status: active                   # active | draft | deprecated
linked-prd: 0003                 # single PRD number, or null
linked-tickets: [3, 13]          # list of task numbers
created: 2026-04-29
owner: dila
```

## Authoring Rules

1. **One case = one objective.** If you can't state it in one sentence, split it.
2. **Steps are observable.** Each step has an Action (do this) and an Expected Result (see this). No "verify it works" hand-waving.
3. **Link, don't duplicate.** If two cases share setup, extract a shared precondition note — don't copy-paste.
4. **Update on behavior change.** When a feature changes, update the linked TCs in the same PR. Drift detection will eventually flag mismatches.

## Lifecycle

| Status       | Meaning                                                  |
| ------------ | -------------------------------------------------------- |
| `draft`      | Being written, not yet runnable                          |
| `active`     | Approved, runnable, expected to pass                     |
| `deprecated` | Retired — kept for history; do not run                   |

## Linking from Tickets

In a task or PRD, reference test cases by ID:

```markdown
## Test Coverage
- [TC-0001](../test-cases/TC-0001-intent-interview-happy-path.md) — happy path
- [TC-0002](../test-cases/TC-0002-intent-interview-validation.md) — invalid input
```

## Test Runs (optional)

For release verification or regression cycles, create `docs/test-runs/YYYY-MM-DD-<label>.md` listing TC-IDs executed, who ran them, and pass/fail per case. Keeps the *what was run when* separate from the *what to run*.

## Index

| ID      | Title                                  | Component         | Priority | Status |
| ------- | -------------------------------------- | ----------------- | -------- | ------ |
| TC-0001 | Intent interview captures user goal    | intent-interview  | high     | active |
