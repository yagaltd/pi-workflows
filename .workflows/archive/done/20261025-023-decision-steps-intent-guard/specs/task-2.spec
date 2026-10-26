spec: task
name: "intent-guard-classify-route"
tags: [intent-guard, judge, routing, fail-open]
max-rounds: 2
---

## Intent

`scripts/intent-guard.mjs --query "..."` classifies a query against the live
plan (task titles parsed from plan.md) and routes: proceed (related ≥
threshold) · amend · answer · ask. The guard routes, never dispatches; it
fails open to `ask-human` when the judge is unavailable.

## Decisions

- One judge call: `choose` kind over
  [current_spec, amend_needed, unrelated, clarification] + `probability`
  confidence. Threshold `--threshold` (default 0.85), read at call time.
- Every verdict appends `{ts, query, route, kind, confidence}` to
  `.workflows/intent/trail.jsonl` — provenance for later lessons.
- `main(argv, {ask})` — ask injectable; CLI passes the real one.

## Boundaries

### Allowed Changes
- scripts/intent-guard.mjs
- tests/intent-guard.test.ts

### Forbidden
- scripts/flow-*.mjs, extensions/index.ts, prompts/, templates/

## Completion Criteria

Scenario: intent-guard classifies queries against the live plan
  Test: intent-guard classifies queries against the live plan
  Then a related query at confidence >= threshold routes proceed and appends the trail

Scenario: intent-guard skips loudly without a judge key
  Test: intent-guard skips loudly without a judge key
  Then a skipped ask routes ask-human with the skip reason recorded

Scenario: intent-guard routes amend-needed and unrelated without dispatch
  Test: intent-guard routes amend-needed and unrelated without dispatch
  Then amend_needed routes amend and unrelated routes answer, both below-threshold routed ask
