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
   - multiple inputs: use pi-core-subagent parallel scout tasks (read-only, inline prompts) when available
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

**Option generation + convergence** (templates/THINKING-TOOLS.md §2–3):
when 2+ viable approaches exist, generate with Green-hat divergence
(radically different approaches, not variations of one), evaluate each with
White (facts) → Yellow (best case) → Black (failure modes), then place the
survivors on the Impact × Effort matrix: Quick Wins plan early, Big Bets
de-risk via `/prototype` before committing, Money Pits get dropped in
writing. The survivors enter the decision tree below with their quadrant
noted.

Classify each decision:

- **Resolved by evidence** — include evidence and use it.
- **Human preference** — ask only if it changes scope/behavior/API.
- **Architecture decision** — ask if hard to reverse or contradictory to ADRs.
- **Implementation detail** — decide yourself from existing patterns.

### Unknowns taxonomy (map vs territory)

The prompt/plan is the **map**; the real codebase, constraints, and user
taste are the **territory**. Classify what's missing from the map (protocol
adapted from the grill-for-unknowns skill):

| Gap | Meaning | How to close it |
|---|---|---|
| Known knowns | Proven by repo/docs/tests | Restate and cite; never ask |
| Known unknowns | A decision is open | Grill — one at a time, with payload (Phase 3) |
| Unknown knowns | User will recognize the right result when shown, but can't specify it | Do NOT ask text questions — offer 2-3 contrasting prototypes / examples / reference modules to react to (`/prototype`), capture their reaction as criteria |
| Unknown unknowns | Constraints nobody has considered | Blindspot pass (below) |

### Blindspot pass (unknown unknowns)

Before Phase 4, when the domain or integration is unfamiliar or high-stakes:
scan docs/source/tests/config for material constraints nobody raised — rate
limits, quotas, platform behavior, data volume, auth boundaries, migration
costs. For each: why it matters, evidence, cheap resolution, decision owner.
Rank by implementation risk. A finding that changes the plan goes into the
Decision Tree; safe ones become labeled assumptions.

```markdown
## Blindspot Pass
1. <constraint>
   - Why it matters: <plan impact>
   - Evidence: <doc/source/test citation>
   - Cheap resolution: <how to settle it fast>
   - Decision owner: user / agent / docs / prototype
### Likely safe assumptions
- <assumption> — why safe, how to verify later
```

If the codebase is familiar and low-risk, skip the pass and say so.

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

**One blocking question at a time** when answers affect later questions —
walk the decision tree branch by branch; don't dump the whole tree.
Use `interview()` only for independent decisions that can be reviewed in one batch.

Every question must be **material** (could change architecture/scope/API/
data model), **grounded** (points at evidence, not preference fishing), and
**answerable** (options or a default — never open-ended "anything else?").

Every question must include:

- recommended answer
- evidence for recommendation
- consequence if wrong
- default if user is AFK

Question format:

```markdown
Blocking question: <decision>
Recommended: <answer>
Evidence: <files/docs/tests/history>
Why it matters: <scope/risk/spec impact if answered differently>
If you don't care: I'll proceed with <default>.
```

For low-risk unknowns, don't ask — pick a sensible default, label it as an
assumption in the plan, and keep grilling only the material ones.

If no unresolved decisions remain, state that and continue.

## Phase 4: PLAN

Ensure the `.workflows/` directory exists:

```bash
mkdir -p .workflows
```

**Bootstrap guard — versioned plans:** if `.workflows/plan.md` already exists
with Status DRAFT / APPROVED / IN PROGRESS, do NOT overwrite it. A live plan
routes to `/review` (ship it) or `/abort` (archive it) first — history is
never silently destroyed. Only proceed on a clean slate (no plan.md, or the
existing one is DONE/SUPERSEDED and already archived).

**Assign a Plan ID**: `YYYYMMDD-NNN` where NNN = (entries in
`.workflows/archive/done` + `.workflows/archive/superseded`) + 1, zero-padded
to 3. Put it in the plan header. Never reuse a Plan ID.

**Install the project charter**: if no `AGENTS.md` exists in the project
root, copy the pi-workflows package's `templates/AGENTS.md` there. It is
auto-loaded by every session — orchestrator and all subagents — so its
containment rules (single status writer, contract-bounded writes, no
subagent commits, archive discipline) bind everyone without re-pasting.
If the project already has its own AGENTS.md, append a "## pi-workflows"
section with the containment rules instead of overwriting.

Create `.workflows/plan.md` using the existing Plan Workflow rules:

- scout tasks first when additional recon is needed
- worker tasks for code changes
- reviewer and quality-reviewer tasks after build tasks
- docs task for meaningful architecture/domain changes
- bottleneck tags: 🔴 BLOCKING, 🟡 RISKY, 🔵 TIME_CONSUMING, 🟠 VERIFICATION_HEAVY, ⚪ STANDARD
- parallel groups when independent tasks can safely run concurrently

Use domain terms from `.workflows/CONTEXT.md` in task titles, specs, and test names.

## Phase 5: STOP FOR APPROVAL

🛑 **GATE**: Do not proceed without approval.

Present the plan for human review:

```markdown
## Idea Ready for Approval

### Evidence Summary
- ...

### Decisions Made
- ...

### Open Risks
- ...

### Plan
- `.workflows/plan.md` lists all planned worker tasks with bottleneck tags and parallel groups
- Contracts will be generated after approval

### Next Step
Approve to generate contracts, then run `/next` to execute.
```

Ask the human:
- Plan structure right?
- Bottleneck tags accurate?
- Testing strategies appropriate?
- Approve to generate contracts and start execution?

## Phase 6: GENERATE CONTRACTS

Once approved, generate `.spec` files for every worker task:

```bash
mkdir -p .workflows/specs
```

For each worker task, write `.workflows/specs/<task-name>.spec` with:

- **Intent**: what to build and why (1-3 sentences)
- **Diagrams** (optional): Mermaid diagram showing flow, architecture, or state machine
- **Decisions**: technical choices already fixed
- **Boundaries**: exact files/globs allowed and forbidden
- **Completion Criteria**: BDD scenarios with explicit `Test:` selectors

Contracts must reflect resolved decisions. Include edge cases and at least one negative scenario.

Use the contract template from the `/plan` workflow.

## Phase 7: DOMAIN MEMORY UPDATES

If the conversation resolved a durable domain term, update `.workflows/CONTEXT.md` (create lazily from `templates/CONTEXT.md` if helpful).

Offer an ADR only when all are true:

1. Hard to reverse
2. Surprising without context
3. Real tradeoff existed

Use `templates/ADR.md` if creating one.

## Phase 8: HAND OFF

Present what was created:

```markdown
## Idea Complete

### Plan
- `.workflows/plan.md`
- `.workflows/specs/` — <N> contracts generated

### Next Step
Run `/next` to execute the first task, or `/auto-next` to run all tasks autonomously.
```

## Rules

- Evidence before interview.
- Ask only unresolved decisions.
- Recommended answer required for every user question.
- Do not implement.
- Do not create ADRs for obvious or easily reversible choices.
