# Project Docs

This is where the **why** of the project lives. Code is the *what* and *how*; the markdown here is the *why* and *what for*.

## Layout

| Folder | Contents | Template |
|---|---|---|
| `prd/` | What features do, who they're for | `.agents/templates/prd.md` |
| `tasks/` | Scoped chunks of work to deliver a PRD | `.agents/templates/task.md` |
| `decisions/` | Why we chose pattern/package X over Y | `.agents/templates/adr.md` |

## Naming

All files use **zero-padded sequential numbers**:

- `prd/0001-add-todo.md`
- `tasks/todo-0001-add-todo-input.md`
- `decisions/0001-use-riverpod.md`

Numbers never get reused. If a doc is abandoned, leave the file rather than deleting it.

## Task Status (Filename Prefix)

| Prefix | Meaning |
|---|---|
| `todo-` | Not started |
| `wip-` | In progress |
| `done-` | Completed |
| `blocked-` | Blocked — see Notes |

## Quick Index

See the per-folder README files (or just `ls`) for what's in flight.

A worked example feature lives in here: PRD-0001, Task-0001, ADR-0001 all describe the basic "add a todo" feature. Read those three together to see the loop end-to-end.
