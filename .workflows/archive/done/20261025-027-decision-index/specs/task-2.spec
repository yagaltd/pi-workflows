spec: task
name: "decisions-seed-wiring-docs-release"
tags: [decisions, wiring, docs]
max-rounds: 2
---

## Intent

Seed the standing decisions already made, wire the check into SHIP, note the
index in the plan skill, document in README, release v0.10.1.

## Decisions

- Seed three records: DEC-001 single judge client (`scripts/judge.mjs`,
  decided-by 20261025-017/023); DEC-002 flows compile onto `resolveNext`,
  never a second scheduler (20261025-022); DEC-003 tdd-gate is the
  build-task test-quality gate, tdd-guard demoted to brownfield pre-filter
  (20260924-013).
- SHIP Stage 3 gains the `decisions check` line; the plan skill notes that
  standing decisions belong in the index with resolving `adr:` links.

## Boundaries

### Allowed Changes
- .workflows/decisions/
- prompts/review.md
- skills/plan/
- README.md
- CHANGELOG.md
- package.json
- tests/decisions-docs.test.ts

### Forbidden
- scripts/decisions.mjs (task-1 owns it)
- extensions/index.ts, agents/, templates/

## Completion Criteria

Scenario: seeded standing decisions render to the index and pass check
  Test: seeded standing decisions render to the index and pass check
  Then the three seeded records exist, INDEX.md is generated, and check exits 0 on the live plan

Scenario: review and plan prompts carry the decision index gate
  Test: review and plan prompts carry the decision index gate
  Then review Stage 3 runs decisions check and the plan skill names the index
