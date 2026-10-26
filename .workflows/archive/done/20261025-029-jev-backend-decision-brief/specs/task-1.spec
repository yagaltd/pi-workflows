spec: task
name: "judge-typesafe-backend"
tags: [judge, typesafe, jev, systemone]
max-rounds: 2
---

## Intent

`scripts/judge.mjs` speaks typesafe System One (`/v1/systemone`, jev-latest)
instead of typellm `/v1/generate`. Key chain: `TYPESAFE_API_KEY` env →
`~/.pi/agent/auth.json` `.typesafe.key`. `ask()` signature unchanged.

## Decisions

- enum [yes,no] or boolean → noul; enum N → choice (criteria from enum
  values); any other schema shape → local error, never sent. State is a
  neutral constant; question text stays self-contained.
- Answers map to verdict rows {id, verdict, confidence, probabilities?}:
  noul → verdict yes/no at 0.5, confidence max(p, 1-p); choice → the picked
  name + its confidence; score (future) → the numeric value.
- Skips unchanged and loud: no key, unreachable, non-JSON. Audit endpoint
  records systemone. QUESTION_CAP and loadQuestions keep their exports.

## Boundaries

### Allowed Changes
- scripts/judge.mjs
- tests/judge.test.ts

### Forbidden
- scripts/closeout.mjs, scripts/flow-*.mjs, scripts/intent-guard.mjs (importers — signature must hold)
- prompts/, README.md, .workflows/queue.json

## Completion Criteria

Scenario: judge translates enum questions to typesafe noul and choice
  Test: judge translates enum questions to typesafe noul and choice
  Then a stubbed fetch receives the systemone body with noul and choice questions keyed by id

Scenario: judge maps systemone answers to verdict rows with confidence
  Test: judge maps systemone answers to verdict rows with confidence
  Then noul answers become yes-no rows with confidence and choice answers carry probabilities

Scenario: judge skips loudly when no key resolves
  Test: judge skips loudly when no key resolves
  Then an injected empty key yields skipped with the auth-chain reason and no fetch call
