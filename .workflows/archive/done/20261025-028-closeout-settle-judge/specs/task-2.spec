spec: task
name: "closeout-wiring-docs-release"
tags: [closeout, wiring, docs]
max-rounds: 2
---

## Intent

Wire close-out + settle judge into `/review` Stage 3, document the marker
convention and commands, release v0.10.2.

## Decisions

- Stage 3 gains: generate the close-out from the archived bundle, run the
  settle judge, render both in the chat before any next-task move.
- README Close-out section documents the marker convention and both
  commands (claim-to-gate rule).

## Boundaries

### Allowed Changes
- prompts/review.md
- README.md
- CHANGELOG.md
- package.json
- tests/closeout-wiring.test.ts

### Forbidden
- scripts/closeout.mjs (task-1 owns it)
- extensions/index.ts, agents/, templates/, skills/

## Completion Criteria

Scenario: review prompt carries the close-out and settle judge steps
  Test: review prompt carries the close-out and settle judge steps
  Then Stage 3 names closeout.mjs report, closeout.mjs judge and the chat render rule

Scenario: closeout runs on the live repo state and emits all sections
  Test: closeout runs on the live repo state and emits all sections
  Then report on .workflows/plan.md exits 0 and contains the five section headers
