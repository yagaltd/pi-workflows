spec: task
name: "lessons-wiring-docs-release"
tags: [lessons, wiring, docs]
max-rounds: 2
---

## Intent

Wire distill into `/review` Stage 3 (after the archive move), document the
ledger, release v0.10.0.

## Decisions

- Stage 3 gains one line: distill from the archive bundle into
  `.workflows/lessons/lessons.jsonl`.
- README Lessons ledger section names distill + set (claim-to-gate rule).

## Boundaries

### Allowed Changes
- prompts/review.md
- README.md
- CHANGELOG.md
- package.json
- tests/lessons-docs.test.ts

### Forbidden
- scripts/lessons.mjs (task-1 owns it)
- extensions/index.ts, agents/, templates/

## Completion Criteria

Scenario: review prompt and readme document the lessons ledger
  Test: review prompt and readme document the lessons ledger
  Then Stage 3 carries the distill command and README names distill + set

Scenario: distill runs on an archived bundle and appends to the ledger
  Test: distill runs on an archived bundle and appends to the ledger
  Then distilling the real archive/done/20261025-021 bundle appends 3 lessons (valid, from_untrusted — no proofs recorded for that plan)
