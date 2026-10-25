spec: task
name: "Plan skill — task tiers + delegated drafting pipeline"
tags: [plan-skill, tiers, drafting, delegation]
max-rounds: 2
---

## Intent

Codify tier taxonomy (how small is small enough, and what each size costs to review) and the
five-phase delegated drafting pipeline into `skills/plan/SKILL.md`. Insertive edits only —
the existing phase structure, decomposition rules, and parallel-group discipline stay verbatim.

## Decisions

- D1+D2 (plan 20260822-005). Two insertions into `skills/plan/SKILL.md`:
- **A. "Task tiers" subsection at the end of Phase 2: DECOMPOSE** (after Bottleneck Tags):
  - **Tier A — mechanical**: ≤20 lines changed, single file, grep-able done. Route
    `@model:standard` + thinking low; review = grep-only tier OR the task's `Verify:` line
    (exit code + git diff — Graph Protocol §9: verification command, never self-report); OR
    **orchestrator-inline** — don't dispatch at all when the subagent round-trip costs more than
    the edit (state this option explicitly in the tier table).
  - **Tier B — bounded**: module + tests under contract, one concern. `@model:standard`
    (⚪/🔵/🟠) or `@model:strong` (🟡/🔴) per bottleneck tag; full mechanical review pipeline.
  - **Tier C — spike/architecture**: verdict artifact required, serial, never in a parallel
    group; `@model:strong` + thinking high; zero production files unless the verdict says GO.
  - Rule: **tier is written next to every task in plan.md** (e.g. `TASK 3 (Tier B 🟡)`) and is
    decided in the adversarial pass (phase 3 of the drafting pipeline), not by the worker.
- **B. "Drafting pipeline" section** — inserted after Phase 3: WRITE PLAN, covering five phases:
  1. **Scout** — facts-on-disk artifact `.workflows/scout/<plan-id>.md`: grep evidence, file
     paths with line anchors, API/vendor realities, existing-convention citations. Facts only —
     never summaries. (Reusable for every downstream phase; commit-adjacent, lives under
     .workflows like specs.)
  2. **Draft** — a subagent (`@model:strong`, thinking high) receives scout facts + user goal +
     this SKILL.md format → writes the plan draft. Grounding rule: every Context claim must
     cite a scout fact (file:line) — uncited claims get flagged in phase 3.
  3. **Adversarial + SPLIT/RISK pass** — orchestrator, challenge-skill discipline: walk every
     decision; single-surface inventory ("does this plan create a second path to X?"); per task:
     "can it be smaller? which tier? where's the integration seam?". Rationale on record:
     dependency-partitioned graphs beat flat fan-out (+14% pass, −35% cost — pi-core-subagent
     "Why waves"); static ties dynamic when structure is known up front — which this pass
     produces. Adjust the draft directly; the draft is never dispatched unreviewed.
  4. **Spec drafting fan-out** — one spec-drafter subagent per decision (`@model:standard`,
     thinking high): inputs = decision verbatim + the scout-fact slices that concern it +
     boundaries + spec name. Orchestrator mechanically reviews each spec: every decision clause
     appears as a Completion Criterion; criteria grep-able or runnable; Allowed/Forbidden
     explicit and disjoint across sibling specs (shared-worktree rule: `git diff`-style criteria
     must be task-scoped).
  5. **Human approval gate** — unchanged: nothing dispatches before user approval.
- Phase 5: GENERATE CONTRACTS gains one sentence: default path for plans ≥2 waves is the
  spec-drafter fan-out; hand-writing remains the fallback.

## Boundaries

### Allowed Changes
- skills/plan/SKILL.md (two inserted sections + one sentence in Phase 5)

### Forbidden
- Everything else — agents/**, README.md, .workflows/**, skills other than plan/, scripts/**, tests/**
- Restructuring existing phases, rewording existing rules/bullets, frontmatter changes

## Completion Criteria

Scenario: Tier taxonomy present and complete
  Test: grep -n "Tier A\|Tier B\|Tier C" skills/plan/SKILL.md | wc -l && grep -c "orchestrator-inline" skills/plan/SKILL.md && grep -c "never in a parallel" skills/plan/SKILL.md
  Then ≥3 tier headings; inline option + Tier C serial rule greppable; tier-written-next-to-task rule present

Scenario: Drafting pipeline five phases
  Test: grep -c "Scout\|Draft\|Adversarial\|fan-out\|approval gate" skills/plan/SKILL.md
  Then all five phases present; scout artifact path `.workflows/scout/` named; grounding rule (cite file:line) present

Scenario: Adversarial pass carries the split/risk checklist
  Test: grep -c "second path to X\|integration seam\|which tier" skills/plan/SKILL.md
  Then single-surface inventory + seam hunt + tier check all greppable; why-waves rationale cited

Scenario: Spec fan-out context contract
  Test: grep -c "decision verbatim\|scout-fact slices\|disjoint" skills/plan/SKILL.md
  Then the three input guarantees + disjointness rule greppable; task-scoped-criteria rule present

Scenario: Existing structure intact
  Test: git diff skills/plan/SKILL.md | grep -c '^-[^-]'
  Then 0 deletions; Phases 1-6, decomposition rules, parallel-group rule, bottleneck tags all verbatim
