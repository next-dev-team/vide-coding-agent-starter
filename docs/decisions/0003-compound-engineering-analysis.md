# ADR-0003: Compound Engineering Analysis

> Status: proposed
> Date: 2026-04-26
> Deciders: (TBD)

## Context

Our research spike analyzed the "Compound Engineering" methodology, which uses a 4-step loop (Plan -> Work -> Review -> Compound), 27 specialized agents, and 23 slash commands. We found that while Agent Kanban's core loop is similar, we lack an automated "Compound" step to encode learnings, our review processes are monolithic rather than specialized, and our workflow triggers require manual scaffolding via Markdown files rather than seamless IDE integration.

## Decision

We will implement three architectural additions to integrate Compound Engineering principles: 1. A new "Compound" MCP tool to automatically extract learnings from completed tasks and update our skills/playbooks. 2. Specialized Review contexts (e.g., Security, Performance) exposed as targeted MCP resources for IDE agents to use during the Review phase. 3. Interactive Kanban UI workflow triggers (like a "Plan Next Feature" button) in the VS Code extension to replace manual template copying and orchestrate these workflows seamlessly.

## Consequences

### Positive
- (TBD)

### Negative / Trade-offs
- (TBD)

### Neutral
- (TBD)

## Alternatives Considered

(TBD)

## References

- PRDs: (link)
- External: (link)
