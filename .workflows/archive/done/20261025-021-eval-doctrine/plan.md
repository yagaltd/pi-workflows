# Plan: Eval doctrine — golden set + flip-watching (021)

> Plan ID: 20261025-021
> Status: APPROVED 2026-10-25 (owner, session-directed) — promoted from
> plan-draft-021-eval-doctrine.md. Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Deterministic only —
> no judge calls in this plan (decision steps are the queued follow-up).

## Context

Borrow-map doctrine: measure, change one thing at a time, keep what holds up.
Gates verify single tasks; no standing eval measures whether a gate or
dispatcher change flipped any previously passing task. Precedent: the v0.6.1
spec-sanity trust test (19 fragments, confusion table, NO-GO path taken)
proved the method — this plan makes it machinery.

## Decisions

- **D1 — Golden cases are data, not code.** `.workflows/evals/golden/*.json`,
  one case per file: `id`, `kind` (dispatcher | gate | degradation |
  archive | docs), `input`/`recorded`, `expected`, `tags`.
- **D2 — Runner is one zero-dep script.** `scripts/eval-golden.mjs`, same
  discipline as `judge.mjs`; dispatcher cases execute through a TS probe
  (`scripts/eval-dispatch-probe.ts`, bun) importing the real `resolveNext` —
  never a re-implementation.
- **D3 — Flip-watching is fail-closed.** SHIP runs
  `eval-golden --baseline`; stable pass→fail blocks SHIP unless the owner
  annotates each flip (`flip: accepted — <why>`). fail→pass recorded, never
  blocks. Missing baseline: warn, write, proceed once.
- **D4 — Each case runs twice.** Outcome counts only when both runs agree;
  disagreement is `flaky`, recorded, never a flip.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `eval-golden.mjs` runner + dispatch probe + fixture tests | task-1.spec | 1 | @model:standard |
| T2 Golden set v1 (≥10 cases from shipped evidence) | task-2.spec | 1 | @model:standard |
| T3 SHIP wiring + docs | task-3.spec (needs T1+T2) | 2 | orchestrator-inline Tier A |

## Tasks

[PARALLEL-GROUP: wave-one]

### TASK 1 (Tier B, 🟡): runner + probe
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/eval-golden.mjs, scripts/eval-dispatch-probe.ts, tests/eval-golden.test.ts, tests/fixtures/evals/
- **Verify**: bun test

### TASK 2 (Tier B, 🟡): golden set v1
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: .workflows/evals/
- **Verify**: node scripts/eval-golden.mjs

### TASK 3 (Tier A, ⚪): wiring + docs
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **tdd**: false
- **Allowed**: prompts/review.md, README.md, CHANGELOG.md, package.json, templates/
- **Verify**: bash scripts/check-drift.sh && bash scripts/docs-lint.sh

## Execution Notes

- TASK 1 ✅ context: no changes — bun test 130/130 (runner 15, suite green); probe imports the real resolveNext.
- TASK 2 ✅ context: no changes — 11 cases (4 dispatcher, 3 gate, 2 degradation, 2 archive/docs); fresh-baseline double run exits 0, 0 flips.
- TASK 3 ✅ context: no changes — review.md Layer 5; README Eval Doctrine; CHANGELOG v0.8.5; version bumped; spec scenarios bound to bun test names (selector-binding convention).
- Wave settle (no judge — deterministic summary): 3/3 ok:true first pass; guard 3/3 after selector binding; flip count 0 across 11 cases.

## Docs impact

- `README.md` — new Eval Doctrine section (names the SHIP gate)
- `prompts/review.md` — Stage 1 Layer 5: golden evals, flip-watching
- `CHANGELOG.md` — v0.8.5 entry (plan 20261025-021)
- `package.json` — version 0.8.5
