spec: task
name: "format-chooser-engine"
tags: [chooser, judge, output, advisory]
max-rounds: 2
---

## Intent

`scripts/format-chooser.mjs`: two advisory questions, one judge call —
artifact form (none/table/mermaid/html) and diagram type (semantic-pattern
groups). Audited, fail-open to none.

## Decisions

- `choose --for <boundary> --content-file <file> [--audit] [--ledger]`:
  boundary closed set (closeout, plan-approval, challenge,
  brainstorm-graduation); content capped at 4000 chars in the question.
- One ask() call, two choice questions; Q2 premise stated (speculative,
  consumed only for visual picks). Verdict rows read by id with confidence
  and probabilities.
- Skipped judge: loud `FORMAT CHOOSER SKIPPED (<reason>)` on stderr, result
  {artifact: "none", skipped: true}; exit 0. main(argv, {ask}) exported.
- Golden case chooser-001: advisory degrade (mode advisory, proceed,
  documented gap).

## Boundaries

### Allowed Changes
- scripts/format-chooser.mjs
- tests/format-chooser.test.ts
- .workflows/evals/golden/chooser-001-advisory-degrade.json

### Forbidden
- scripts/judge.mjs (import only), scripts/closeout.mjs, skills/, prompts/, README.md

## Completion Criteria

Scenario: chooser ranks artifact form and diagram type from one judge call
  Test: chooser ranks artifact form and diagram type from one judge call
  Then a stubbed ask returns artifact and type verdicts with confidence and both surface in the result

Scenario: chooser fails open to none when the judge is unavailable
  Test: chooser fails open to none when the judge is unavailable
  Then a skipped ask yields artifact none, a loud stderr line, and exit 0

Scenario: chooser rejects unknown boundaries and missing content files
  Test: chooser rejects unknown boundaries and missing content files
  Then an off-list boundary or absent file exits 2 with the reason
