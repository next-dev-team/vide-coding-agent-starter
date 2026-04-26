# AGENTS.md

Instructions for AI coding agents working in this repo.

## Project

A local-first **todo list app** built with React + Vite + TypeScript. Built as a learning project, so prefer **clarity over cleverness**.

## Tech Stack

| Layer     | Choice            | Why                                |
| --------- | ----------------- | ---------------------------------- |
| Framework | React 19          | Most popular UI library            |
| Language  | TypeScript        | Type safety, better DX             |
| Bundler   | Vite              | Fast dev server, modern defaults   |
| State     | React hooks       | Built-in, simple for small apps    |
| Storage   | localStorage      | Zero setup, works everywhere       |

Do **not** add new packages without asking.

## Commands

| Task         | Command             |
| ------------ | ------------------- |
| Install deps | `npm install`       |
| Run app      | `npm run dev`       |
| Build        | `npm run build`     |

## Coding Conventions

- **File names**: `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils.
- **Components**: Function components only. No class components.
- **Hooks**: Custom hooks in `src/hooks/`. Prefix with `use`.
- **State**: Use `useState` for simple state, `useReducer` for complex state.
- **No business logic in components** — push to hooks.
- **No `any`** — use proper TypeScript types.

## Definition of Done

1. Code compiles (`npm run build`)
2. No TypeScript errors
3. New behavior has at least one test
4. Task file renamed to `done-*.md`
