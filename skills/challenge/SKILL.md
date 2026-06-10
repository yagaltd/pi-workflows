---
name: challenge
description: Adversarial grill of a plan against domain model. Walks decision tree, sharpens terminology, updates .workflows/CONTEXT.md inline. Use when user wants to stress-test a plan or says "grill me".
---

# Challenge Workflow

Interview the user relentlessly about every aspect of their plan until reaching shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

## Phase 1: READ EXISTING CONTEXT

Before asking questions, gather existing knowledge:

1. Read `.workflows/plan.md` to understand the plan
2. Read `.workflows/CONTEXT.md` if it exists — this is the domain glossary
3. Read `.workflows/docs/adr/*.md` if they exist — previous architecture decisions
4. Check for `.workflows/CONTEXT-MAP.md` for multi-context repos
5. Use `find`/`grep` to explore relevant source code

## Phase 2: GRILL — ONE QUESTION AT A TIME

Walk the decision tree. For each branch:

1. **State what you understand** from the plan and existing docs
2. **Ask ONE question** with your recommended answer
3. **Cross-reference code**: if they state how something works, check if the code agrees
4. **Sharpen fuzzy language**: if they use vague terms ("account", "user", "item"), propose a precise canonical term
5. **Challenge against glossary**: if a term conflicts with existing .workflows/CONTEXT.md, call it out
6. **Discuss concrete scenarios**: invent scenarios that probe edge cases
7. **Wait for their answer** before moving to the next question

Question format:
```
Decision: <what needs deciding>
Recommended: <your recommendation>
Evidence: <code/docs/prior decisions that support this>
Consequence if different: <scope/risk impact>
Question: <specific choice>
```

If a question can be answered by exploring the codebase, explore instead of asking.

## Phase 3: UPDATE .workflows/CONTEXT.md INLINE

When a term is resolved, update `.workflows/CONTEXT.md` **immediately**. Do not batch these up.

Format: see `templates/CONTEXT-FORMAT.md`

Rules:
- .workflows/CONTEXT.md is a **glossary only** — no implementation details, no specs, no scratch notes
- One entry per domain term
- Concise definitions (1-3 sentences)
- Link related terms

## Phase 4: OFFER ADRs SPARINGLY

Only offer to create an ADR when ALL 3 are true:
1. **Hard to reverse** — changing later costs meaningful effort
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **Result of a real tradeoff** — there were genuine alternatives with specific reasons

If any is missing → skip the ADR. Use `templates/ADR-FORMAT.md` when creating one.

## Phase 5: PRESENT FINAL STATE

```
## Challenge Complete

### Terms Resolved
- <term>: <definition> (added to .workflows/CONTEXT.md)
- <term>: <definition>

### ADRs Created (if any)
- .workflows/docs/adr/0001-<title>

### Plan Changes
- <what changed in the plan based on the grill>

### Next Step
<approved to proceed / needs revision / kill>
```

🛑 STOP. Get human approval before proceeding to implementation.

## Rules

- **One question at a time.** Wait for answer before next question.
- **Recommended answer required.** Every question includes your recommendation.
- **Explore first.** If the answer is in code/docs, find it — don't ask.
- **.workflows/CONTEXT.md is live.** Update as terms are resolved, not at the end.
- **ADRs are rare.** Most decisions don't need one.
- **Challenge assumptions.** If the plan has gaps, call them out.
