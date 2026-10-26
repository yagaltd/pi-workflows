spec: task
name: "typesafe-docs-queue-release"
tags: [docs, queue, release]
max-rounds: 2
---

## Intent

Docs name the typesafe config, the queue seeds C/D/E, DEC-004 records the
backend swap, release v0.11.0.

## Decisions

- README judge section: key chain (env → auth.json), endpoint, model env.
- prompts/plan.md skip text names TYPESAFE_API_KEY.
- Queue rows: intent-guard hook (C), lessons in /plan + /challenge (D),
  anews pack (E) — with effort, risk, unblocks, recommend filled.
- DEC-004 via decisions.mjs record; DEC-001 unchanged.

## Boundaries

### Allowed Changes
- prompts/plan.md
- README.md
- CHANGELOG.md
- package.json
- .workflows/queue.json
- tests/queue-wiring.test.ts

### Forbidden
- scripts/ (tasks 1-2 own them)

## Completion Criteria

Scenario: docs name typesafe config and the next-moves gate
  Test: docs name typesafe config and the next-moves gate
  Then README carries the key chain and the Next-moves line and the plan prompt names TYPESAFE_API_KEY

Scenario: queue json carries c d e options with all columns
  Test: queue json carries c d e options with all columns
  Then the seeded queue has three rows each with option what effort risk unblocks recommend
