---
id: TC-0001
title: Intent interview captures user goal and produces PRD-ready JSON
component: intent-interview
priority: high
type: manual
status: active
linked-prd: 0003
linked-tickets: []
created: 2026-04-29
owner: dila
---

# TC-0001: Intent interview captures user goal and produces PRD-ready JSON

## Objective

Verify that `intent_interview` accepts a rough description, returns the structured questionnaire, and produces output that can be piped into `prd_create`.

## Preconditions

- MCP server is running and `intent_interview` is registered
- Workspace has `.agents/templates/interview.md` present
- No prior interview state in `.agents/intent.json`

## Test Data

- Input description: `"Add support for tagging tasks with arbitrary labels"`
- Expected questionnaire fields: `goal`, `non-goals`, `edge-cases`, `constraints`, `success-criteria`, `suggested-approach`

## Steps

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Invoke `intent_interview` tool with the input description | Tool returns a JSON object containing all 6 questionnaire fields |
| 2 | Inspect returned JSON | Each field is a non-empty prompt string the agent can answer |
| 3 | Fill answers and pipe the JSON into `prd_create` | `prd_create` returns success and writes a new PRD file under `docs/prd/` |
| 4 | Open the generated PRD | Sections (Problem, Users, Acceptance Criteria, Out of Scope) are populated from the interview answers |

## Postconditions

- A new PRD file exists in `docs/prd/` with a fresh sequential number
- `.agents/intent.json` reflects the completed interview (or is cleared, depending on impl)

## Notes

- Sourced from PRD-0003 acceptance criteria
- Companion negative case: TC-0002 (validation / missing input) — to be authored
- If `interview.md` template is missing, expect a clear error — covered by future TC
