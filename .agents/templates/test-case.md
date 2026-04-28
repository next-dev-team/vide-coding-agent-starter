---
id: TC-NNNN
title: <Short Description>
component: <feature-or-area>
priority: medium          # high | medium | low
type: manual              # manual | automated
status: active            # active | draft | deprecated
linked-prd: NNNN          # PRD number(s), or null
linked-tickets: []        # list of task numbers, e.g. [13, 14]
created: YYYY-MM-DD
owner: <name>
---

# TC-NNNN: <Short Description>

## Objective

One sentence describing what this test verifies.

## Preconditions

- State the system must be in before running
- Required fixtures, env vars, or setup

## Test Data

- Input: ...
- Expected output: ...

## Steps

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 |        |                 |
| 2 |        |                 |
| 3 |        |                 |

## Postconditions

- State the system should be in after the test passes
- Cleanup required (if any)

## Notes

(Edge cases, related TCs, known flakiness, links to bug tickets)
