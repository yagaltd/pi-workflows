# ADR Format

Architecture Decision Records capture significant decisions that are hard to reverse, surprising to newcomers, or the result of a real tradeoff.

## When to create an ADR

All 3 must be true:
1. **Hard to reverse** — changing later costs meaningful effort
2. **Surprising without context** — a future reader will wonder "why did they do this?"
3. **Result of a real tradeoff** — there were genuine alternatives with different tradeoffs

If any of the 3 is missing → skip the ADR. Just update .workflows/CONTEXT.md or leave a code comment instead.

## Format

```markdown
# ADR-<N>: <Title>

**Status:** [Proposed | Accepted | Deprecated | Superseded]

**Context:** What problem are we solving? What constraints exist? What alternatives were considered?

**Decision:** What did we decide and why? What tradeoffs did we accept?

**Consequences:** What changes as a result? What do we gain or lose? What should future readers watch out for?
```

## Naming

- File: `.workflows/docs/adr/<NNNN>-<short-description>.md`
- Number sequentially: 0001, 0002, etc.
- Use kebab-case for the description

## Rules

1. **Sparse** — most decisions don't need an ADR. Default: skip
2. **Only real tradeoffs** — if the choice was obvious, no ADR needed
3. **Update when superseded** — when a decision is reversed, mark old ADR as Superseded and link to the new one
