spec: task
name: "closeout-generator-settle-judge"
tags: [closeout, settle-judge, clarity, zero-dep]
max-rounds: 2
---

## Intent

`scripts/closeout.mjs`: gather plan + journal + proofs + lessons + golden
count into the fixed close-out sections (Shipped · Deviations · Discoveries
· Deferred · Watch), render an optional mermaid plan-vs-actual diagram, and
run the settle judge — one verify-question call checking clarity of the
report.

## Decisions

- Markers in plan Execution Notes are the contract: `DEVIATION: <what> —
  because <why> — implication: <impact>`, `DISCOVERY: <fact>`, `DEFERRED:
  <item> — <why> — implication: <impact>`. Render only what markers declare.
- `report --plan <file> [--journal F] [--proofs F] [--lessons F] [--diagram]`
  prints the fixed sections; exit 0.
- `judge --plan <file> [--report-file F]`: builds four verify questions
  (deviations complete, implications stated, deferrals named, watch present)
  from the gathered report and calls `ask` from `scripts/judge.mjs`
  (injectable in `settleJudge`). Skipped judge ⇒ loud skip line + status
  skipped; unmet verify ⇒ advisory finding. Exit 0 always (advisory).
- `main(argv, {ask})` exported for tests.

## Boundaries

### Allowed Changes
- scripts/closeout.mjs
- tests/closeout.test.ts

### Forbidden
- scripts/judge.mjs (import only — one judge client)
- scripts/run-journal.mjs, scripts/proof-ledger.mjs, scripts/lessons.mjs (read files directly)
- prompts/, README.md, extensions/index.ts

## Completion Criteria

Scenario: closeout gathers shipped tasks deviations and discoveries into the fixed sections
  Test: closeout gathers shipped tasks deviations and discoveries into the fixed sections
  Then a fixture plan with marker lines renders Shipped, Deviations, Discoveries, Deferred and Watch sections with the declared content

Scenario: closeout diagram renders plan versus actual with deviation markers
  Test: closeout diagram renders plan versus actual with deviation markers
  Then --diagram emits a mermaid block marking done, failed and deviated tasks

Scenario: settle judge flags missing implications and skipped judges loudly
  Test: settle judge flags missing implications and skipped judges loudly
  Then a stubbed ask returning no on deviations-complete yields an advisory finding, and a skipped ask prints a loud skip line
