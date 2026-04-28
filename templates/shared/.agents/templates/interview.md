# Intent Interview Template

Customize these questions for your project. The agent uses them to clarify intent before creating a PRD.

## GOAL

**What is the ONE thing this feature/change should achieve? Describe the end state in one sentence.**

_Forces clarity. If you can't say it in one sentence, the scope is too big._

## USERS

**Who benefits from this? (e.g. end users, developers, CI pipeline, agents)**

_Different users need different UX. An API for agents ≠ a UI for humans._

## SCOPE

**What is explicitly OUT of scope? What should this NOT do?**

_Non-goals prevent scope creep. Name at least 2 things you're choosing not to build._

## EDGE_CASES

**What happens when things go wrong? (empty input, network failure, concurrent access, huge data)**

_Edge cases account for 80% of bugs. Think about failure modes upfront._

## CONSTRAINTS

**Are there constraints? (existing API contracts, performance requirements, no new dependencies, backwards compatibility)**

_Constraints shape the solution. Missing a constraint means rework._

## SUCCESS

**How will you know it's done? List 3-5 testable acceptance criteria.**

_If you can't test it, you can't ship it. Be specific: 'response < 200ms' not 'fast'._

## APPROACH

**Do you have a preferred approach or pattern? Or should the agent decide?**

_If you have opinions on architecture (e.g. 'use existing parser'), say it now._
