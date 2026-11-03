spec: task
name: eval-orchestration-core
tags: [evals, jev, kaizen, tdd]
verify: "bun test tests/eval-orchestration.test.ts && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

`scripts/eval-orchestration.mjs` — batched Jev rubric judgment of representative dispatch packs, scored per dimension, stored per commit, compared per version, kaizen triggers fired per threshold rules. Advisory: exit 0 always (except usage errors); measurement never blocks.

## Decisions

- **Fixture packs** (fixtures/evals/packs/*.json, 5 synthetic, authored from real dispatch patterns): tdd-task, docs-task, boundary-violation-attempt, budget-blowout, research-task — each: {scenario, packText (the literal dispatch prompt), roleContext}. Packs are DOCTRINE-COMPLIANT or deliberately non-compliant per scenario (boundary-violation pack must LACK a boundaries section — the judge should catch it).
- **Rubric** (fixtures/evals/rubric.json): typed question templates per dimension — boundaries (allowed-changes stated, forbidden stated, scope-in-tree), budget (line present, caps explicit), done-when (checklist present, per-line assertion), citations (cite-or-open-questions present), tdd (tests-first ordered, verify commands exact), secrets (no key-file instructions), guard (GUARD step present), report (mandatory sections listed). ≤64 questions per pack batch (judge.mjs cap), one ask() per pack.
- **Scoring**: per-dimension ratio = passed_questions/total in the dimension; overall = mean of dimension ratios.
- **History**: append per run to .workflows/evals/orchestration/history.jsonl: {sha (git rev-parse HEAD), timestamp, perDimension, overall, judgedAt}. Dir created on demand.
- **Compare + triggers** vs the immediately-previous history entry (config: fixtures/evals/thresholds.json — per-dimension floor 0.8, overall drift 0.10, consecutive 2):
  - daily-kaizen: exactly one dimension < floor, previous version ≥ floor, overall ≥ (1 - drift)
  - kaizen-event: any dimension < floor for 2 consecutive entries, OR overall drop > drift, OR ≥2 dimensions < floor in the same run
  - stable: none fired
  - Output prints the fired trigger + dimension evidence; exit 0 in every measurement outcome (usage errors exit 2)
- **No key** → loud `JUDGE SKIPPED`, exit 0, no history row (precedent: pii-scan).
- **Tests**: fake askImpl injection (C-lite/#7 pattern — zero network); pins for scoring math, history append, all three trigger classes, skip path, dimension mapping.

## Boundaries

### Allowed Changes
- scripts/eval-orchestration.mjs (new)
- fixtures/evals/ (new: packs, rubric.json, thresholds.json)
- tests/eval-orchestration.test.ts (new)
- .gitignore (whitelist line for .workflows/evals/)

### Forbidden
- Do not modify scripts/judge.mjs (import ask)
- Do not modify justfile, agents/, prompts/, skills/, CHANGELOG.md (T2's files)
- Do not wire into the ci recipe
- No network in tests (fake askImpl)

## Completion Criteria

Scenario: native judgment scoring
  Test: rubric questions batched per pack via fake askImpl
  Given fixture packs and a fake askImpl returning known enum answers
  When eval-orchestration runs
  Then one ask() per pack, per-dimension ratios correct, overall = mean

Scenario: history per commit
  Test: history row appended with sha
  Given a run with scoring results
  When it completes
  Then history.jsonl gains one row {sha, perDimension, overall}

Scenario: daily-kaizen trigger
  Test: single-dimension floor breach fires daily-kaizen
  Given previous entry all dimensions ≥ floor and current has exactly one < floor
  When compare runs
  Then output names daily-kaizen + the dimension, exit 0

Scenario: kaizen-event trigger
  Test: 2-consecutive breach fires kaizen-event
  Given two consecutive entries with the same dimension < floor
  When compare runs
  Then output names kaizen-event + evidence, exit 0

Scenario: judge skipped path
  Test: no key → loud skip, no history row
  Given fake askImpl raising the no-key condition
  When eval runs
  Then JUDGE SKIPPED printed, exit 0, history unchanged
