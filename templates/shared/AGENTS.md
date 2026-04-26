# AGENTS.md

Instructions for AI coding agents working in this repo.

## Project

A cross-platform app. Local-first (no backend yet). Built as a learning project, so prefer **clarity over cleverness**.

## Commands

| Task         | Command                          |
| ------------ | -------------------------------- |
| Install deps | See template-specific README     |
| Run app      | See template-specific README     |
| Run tests    | See template-specific README     |
| Lint/analyze | See template-specific README     |

## Project Structure

```
docs/
├── prd/        # Product requirements (what + why)
├── tasks/      # Task breakdowns (how, scoped)
└── decisions/  # ADRs (why we chose X)
.agents/
├── skills/     # Agent skill files
├── templates/  # PRD, task, ADR templates
└── workflows/  # Development loop
```

## Workflow

When the user gives you a **PRD** or **task file**, follow the loop in `.agents/workflows/feature-loop.md`.

When making a **non-trivial architectural choice**, write an ADR using `.agents/templates/adr.md`.

When the user describes a **new feature in chat without a PRD**, offer to draft one first using `.agents/templates/prd.md`.

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
- Deleting files
- Adding a backend or network calls
- Starting a non-trivial task without a PRD

**Assume and proceed when:**

- Creating new components that follow existing patterns
- Writing tests for new code
- Fixing lint warnings
- Adding obvious docstrings

## Skills & References

| Task involves...                               | Read                                 |
| ---------------------------------------------- | ------------------------------------ |
| Working from a PRD or task                     | `.agents/workflows/feature-loop.md`  |
| Writing a task (for yourself or another agent) | `.agents/skills/task-writing.md`     |

## Definition of Done

A task is done when:

1. Code compiles with no errors
2. Tests pass
3. New behavior has at least one test
4. No new lint warnings
5. Public APIs have documentation
6. Task file renamed to `done-*.md`
7. Any non-obvious decision logged as an ADR
