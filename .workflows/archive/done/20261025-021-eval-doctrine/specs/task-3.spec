spec: task
name: "ship-wiring-eval-doctrine-docs"
tags: [evals, ship, docs, review-gate]
max-rounds: 2
---

## Intent

Wire the golden eval into the SHIP gate chain and document the doctrine:
review Stage 1 gains Layer 5 (golden evals, flip-watching), README documents
the eval set and the fail-closed rule, CHANGELOG carries the release entry,
version bumps.

## Decisions

- Review Stage 1 gains Layer 5 — command
  `node scripts/eval-golden.mjs --baseline .workflows/evals/baseline.jsonl`;
  flips block SHIP; owner-annotated accepted flips are the only pass path.
- README section names its gate explicitly (claim-to-gate rule).
- Version 0.8.5; CHANGELOG entry dated 2026-10-25 with Plan ID.

## Boundaries

### Allowed Changes
- prompts/review.md
- README.md
- CHANGELOG.md
- package.json
- templates/
- tests/ship-wiring.test.ts

### Forbidden
- scripts/, tests/, .workflows/ (tasks 1–2 own those)
- extensions/index.ts

## Completion Criteria

Scenario: review prompt carries the golden-eval layer
  Test: review prompt carries the golden-eval layer
  Then prompts/review.md Stage 1 has Layer 5 with the eval-golden command and fail-closed rule

Scenario: README documents the doctrine and names the gate
  Test: README documents the doctrine and names the gate
  Then the Eval Doctrine section names the SHIP gate command

Scenario: release recorded
  Test: release recorded
  Then CHANGELOG carries the plan 20261025-021 entry and package.json is 0.8.5
