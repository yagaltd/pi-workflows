---
name: amend
description: Update an existing plan and specs when the user changes their mind. Use when a plan/spec already exists and requirements, decisions, or constraints need to change.
user-invocable: true
argument-hint: "<change request>"
---

# Amend Workflow

Change plan/spec artifacts safely. Do not implement unless explicitly asked after amendment is approved.

## Phase 1: LOAD CURRENT STATE

Read:

1. `plan.md` if present
2. relevant `specs/*.spec`
3. `git diff --stat` and `git diff` to see in-progress work
4. `CONTEXT.md`, `CONTEXT-MAP.md`, and relevant `docs/adr/*.md` if present
5. completed/in-progress task notes in `plan.md`

If no plan/spec exists, stop and route to `/idea`.

## Phase 2: IMPACT ANALYSIS

Before editing anything, report:

```markdown
## Amendment Impact

### Requested Change
<change>

### Affected Artifacts
- `plan.md`: <impact>
- `specs/x.spec`: <impact>
- `CONTEXT.md`: <impact or none>
- ADRs: <conflict or none>

### Affected Work
- Completed tasks invalidated: <list or none>
- In-progress work at risk: <list or none>
- Tests/contracts needing update: <list>

### Risk
LOW / MEDIUM / HIGH — <reason>
```

If change contradicts an ADR, flag the conflict and ask before proceeding.

## Phase 3: DECISION-TREE GRILL

Ask only unresolved decisions created by the amendment.

For each question include:

- recommended answer
- evidence from code/docs/specs
- consequence if wrong
- default if user is AFK

Ask one-by-one when decisions depend on previous answers. Use `interview()` only for independent choices.

## Phase 4: UPDATE ARTIFACTS

After decisions are clear, update only artifacts needed:

- `plan.md`
- affected `specs/*.spec`
- `CONTEXT.md` for durable domain terms
- ADR only when hard to reverse, surprising, and based on real tradeoff

Mark invalidated tasks clearly. Add amendment notes to `plan.md` so future `/next` can reason about changed boundaries.

## Phase 5: STOP

Output:

```markdown
## Amendment Complete

### Updated
- <files>

### Invalidated / Needs Rework
- <tasks/specs or none>

### Next Step
Run `/next` to continue, or `/review` if implementation already changed.
```

Do not implement code changes as part of amendment unless the user explicitly asks after approving updated specs.

## Rules

- Specs are source of truth for worker agents.
- Never silently change task intent after work has started.
- Search repo/docs before asking questions.
- Preserve already-completed work unless the user accepts invalidation.
