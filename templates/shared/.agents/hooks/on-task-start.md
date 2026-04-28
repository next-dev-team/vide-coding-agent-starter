# On Task Start

**Auto-triggered when a task moves to WIP.**

Before writing any code:

1. **Read the task file** — understand the goal, acceptance criteria, and files affected
2. **Check memory** — run `memory_find` for related past work and patterns
3. **Read the PRD** — if the task references a PRD, read it for full context
4. **Create a worktree** — isolate your work on a dedicated branch
5. **Run the test suite** — establish a passing baseline before making changes
6. **Plan your approach** — outline the implementation steps before coding

> This hook runs automatically. The agent should follow these steps without prompting.
