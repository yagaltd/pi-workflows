---
name: idea
description: Productize an idea into an execution plan. Explore evidence first, grill only unresolved decisions, then write .workflows/plan.md and agent-spec contracts. Use when the user has a feature/product idea and wants it turned into implementation-ready tasks.
user-invocable: true
argument-hint: "<idea description, repo paths, URLs, or constraints>"
---

# Idea Workflow

Productize an idea into an execution plan: evidence → decisions → plan → contracts. Do not implement.

## Phase 1: EXPLORE FIRST

Gather evidence before asking questions.

1. **Read domain memory first** if present:
   - `.workflows/CONTEXT.md` — shared glossary and domain rules
   - `.workflows/CONTEXT-MAP.md` — multiple bounded contexts and doc locations
   - `.workflows/docs/adr/*.md` — accepted architectural decisions
2. **Scout the current repo**:
   - `find`/`rg` relevant files, modules, tests, routes, CLI commands, schemas
   - read key files and tests
   - inspect dependencies (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.)
   - check recent related history with `git log --oneline -20` and targeted `git log -- <path>` when useful
3. **Scout external inputs**:
   - URLs: `curl -sL <url> | head -1000`
   - GitHub repos: clone to `/tmp/explore-<name>` and scout
   - multiple inputs: use pi-subagents parallel scout tasks when available
4. **Check baseline health when useful**:
   - run existing tests/lint/typecheck/build if cheap and relevant
   - report existing failures separately from proposed work

**Rule:** If a question can be answered by repo/docs/tests/history, answer it from evidence. Do not ask the user.

**Output:** concise evidence summary:

```markdown
## Evidence
- Existing pattern: <files/tests>
- Domain terms: <.workflows/CONTEXT.md terms or none>
- ADR constraints: <relevant ADRs or none>
- Current gaps: <what does not exist>
- Risks/unknowns: <unknowns that matter>
```

## Phase 2: BUILD DECISION TREE

Extract decisions from evidence.

Classify each decision:

- **Resolved by evidence** — include evidence and use it.
- **Human preference** — ask only if it changes scope/behavior/API.
- **Architecture decision** — ask if hard to reverse or contradictory to ADRs.
- **Implementation detail** — decide yourself from existing patterns.

Represent dependencies:

```markdown
## Decision Tree
1. <Decision A>
   - Recommended: <answer>
   - Evidence: <files/docs/tests>
   - If user chooses differently: <consequence>
   - Blocks: <Decision B, Task 2>
2. <Decision B> (only if A = ...)
```

## Phase 3: GRILL ONLY UNRESOLVED DECISIONS

Ask only decisions that remain unresolved after Phase 1.

Use one-by-one questions when answers affect later questions. Use `interview()` only for independent decisions that can be reviewed in one batch.

Every question must include:

- recommended answer
- evidence for recommendation
- consequence if wrong
- default if user is AFK

Question format:

```markdown
Decision: <decision>
Recommended: <answer>
Evidence: <files/docs/tests/history>
Consequence if different: <scope/risk/spec impact>
Question: <specific choice>
```

If no unresolved decisions remain, state that and continue.

## Phase 4: PLAN

Ensure the `.workflows/` directory exists:

```bash
mkdir -p .workflows
```

Create or update `.workflows/plan.md` using the existing Plan Workflow rules:

- scout tasks first when additional recon is needed
- worker tasks for code changes
- reviewer and quality-reviewer tasks after build tasks
- docs task for meaningful architecture/domain changes
- bottleneck tags: 🔴 BLOCKING, 🟡 RISKY, 🔵 TIME_CONSUMING, 🟠 VERIFICATION_HEAVY, ⚪ STANDARD
- parallel groups when independent tasks can safely run concurrently

Use domain terms from `.workflows/CONTEXT.md` in task titles, specs, and test names.

## Phase 5: WRITE CONTRACTS

For every worker task, write `.workflows/specs/*.spec` with:

- Intent
- Decisions
- Boundaries
- Completion Criteria with explicit `Test:` selectors

Contracts must reflect resolved decisions. Do not leave broad design choices for worker agents.

## Phase 6: DOMAIN MEMORY UPDATES

If the conversation resolved a durable domain term, update `.workflows/CONTEXT.md` (create lazily from `templates/CONTEXT.md` if helpful).

Offer an ADR only when all are true:

1. Hard to reverse
2. Surprising without context
3. Real tradeoff existed

Use `templates/ADR.md` if creating one.

## Phase 7: STOP FOR APPROVAL

Do not implement. Present:

```markdown
## Idea Ready for Approval

### Evidence Summary
- ...

### Decisions Made
- ...

### Open Risks
- ...

### Plan
- `.workflows/plan.md`
- specs: <list>

### Next Step
Approve plan, then run `/next` or `/add-feature .workflows/specs/<task>.spec`.
```

## Rules

- Evidence before interview.
- Ask only unresolved decisions.
- Recommended answer required for every user question.
- Do not implement.
- Do not create ADRs for obvious or easily reversible choices.
