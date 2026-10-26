# Plan: Flows IR — declarative flows on resolveNext (022)

> Plan ID: 20261025-022
> Status: APPROVED 2026-10-25 (owner, session-directed) — promoted from
> plan-draft-022-flows-ir.md. Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Deterministic only —
> typed decision steps ride a queued plan; this plan lands format, validator,
> runner, gate resolution.

## Context

Borrow-map rows: flows = declarative JSON graph (steps, waves, gates)
validated before run, executed as input to the existing dispatcher. Gates are
reused, never rebuilt: the flow gate vocabulary resolves to the command sets
the auto-gate hook and `/review` already run. Budget, journal, and typed
decision steps stay in their queued plans.

Layout note vs draft: the repo keeps engine code in `scripts/` + `tests/`
(no `src/`); flow modules land there. Wave order corrected from draft:
the gate resolver (T3) lands before the runner (T2) because the runner
consumes it.

## Decisions

- **D1 — Flows compile onto `resolveNext()`.** The runner renders flow steps
  into the house plan-text format and calls the dispatcher through the
  shipped bun probe pattern — never a second scheduler.
- **D2 — Validated before run, dependency-free.** Validator is pure JS
  (TypeBox is only available under the pi host); blocked codes:
  `schema-invalid`, `dup-id`, `unknown-kind`, `self-edge`, `cycle`,
  `missing-ref`, `empty-wave`, `bad-dep-wave`. An invalid flow never
  dispatches.
- **D3 — Storage: `.workflows/flows/<slug>.json`; runs write
  `.workflows/flows/runs/<slug>/`** (per-task dispatch packs + report.json).
- **D4 — Gate steps reference existing gates by name** — `contract`
  (agent-spec guard), `test-quality` (tdd-gate gaming), `review`
  (check-drift + docs-lint). Absent toolchain ⇒ loud `skipped`, never a
  silent pass.
- **D5 — v1 runner is the control plane**: validation, wave computation,
  per-task dispatch packs, gate execution. Workers stay with `/next`.
  Transform steps record deterministic `set` fields into the run report.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 Flow schema + validator + blocked codes | task-1.spec | 1 | @model:standard |
| T3 Gate-step resolution (D4) | task-3.spec | 2 | @model:standard |
| T2 Runner + flow-run CLI | task-2.spec (needs T1+T3) | 3 | @model:standard |
| T4 Example flows + skill + docs + ship | task-4.spec (needs all) | 4 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): schema + validator
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/flow-schema.mjs, scripts/flow-validate.mjs, tests/flows-validate.test.ts
- **Verify**: bun test

### TASK 3 (Tier B, 🟡): gate-step resolution
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: scripts/flow-gates.mjs, tests/flows-gates.test.ts
- **Verify**: bun test

### TASK 2 (Tier B, 🟡): runner + CLI
- **Status**: ✅ DONE
- **Wave**: 3
- **Depends On**: TASK 1, TASK 3
- **tdd**: false
- **Allowed**: scripts/flow-run.mjs, tests/flows-run.test.ts, tests/fixtures/flows/
- **Verify**: bun test

### TASK 4 (Tier A, ⚪): examples + skill + docs
- **Status**: ✅ DONE
- **Wave**: 4
- **Depends On**: TASK 1, TASK 2, TASK 3
- **tdd**: false
- **Allowed**: .workflows/flows/, skills/flows/, README.md, CHANGELOG.md, package.json, tests/flows-examples.test.ts
- **Verify**: bash scripts/check-drift.sh && bash scripts/docs-lint.sh

## Execution Notes

- TASK 1 ✅ context: no changes — validator pure JS (TypeBox only under pi host; deviation recorded); blocked codes fixture-tested.
- TASK 3 ✅ context: no changes — gate resolver + injectable presence for deterministic skip tests.
- TASK 2 ✅ context: no changes — probe extended to carry the pack (golden test relaxed to decision fields); wave boundary = probe no-tasks; packs + report.json under runs dir.
- TASK 4 ✅ context: no changes — two examples, flows skill, README Flows section, CHANGELOG v0.9.0.
- Wave settle (deterministic): 4/4 ok:true; bun test 152/152; golden 11/11, 0 flips.

## Docs impact

- `README.md` — Flows section (names the validating gate)
- `skills/flows/SKILL.md` — format + run documentation
- `CHANGELOG.md` — v0.9.0 entry (plan 20261025-022)
- `package.json` — version 0.9.0
