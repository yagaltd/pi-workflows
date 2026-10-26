spec: task
name: "flow-decision-steps-typed-answers"
tags: [flows, decision, judge, thresholds]
max-rounds: 2
---

## Intent

Flow `decision` steps ask the judge one calibrated question set and record
typed answers into the run report and flow state; assertions on value or
confidence fail the step; an unavailable judge is a loud skip.

## Decisions

- `scripts/flow-decision.mjs` exports `judgeQuestions(step)` (flow question
  config → judge `{id, question, schema}` set) and `runDecisionStep(step,
  {ask})` — ask is injectable; the runner passes the real `ask` from
  `scripts/judge.mjs`.
- Answers per question: `{value, confidence}` from verdict rows
  `{id, verdict, confidence?}` (confidence defaults 1).
- Assert: `{question, equals}` | `{question, in}` | `{question,
  min_confidence}` — unmet ⇒ status fail with the assertion in the reason.

## Boundaries

### Allowed Changes
- scripts/flow-decision.mjs
- scripts/flow-schema.mjs (decision kind)
- scripts/flow-validate.mjs (decision branch)
- scripts/flow-run.mjs (decision execution)
- tests/flows-decision.test.ts

### Forbidden
- scripts/judge.mjs (import only — one judge client)
- scripts/intent-guard.mjs, tests/intent-guard.test.ts (task-2)
- extensions/index.ts, prompts/, templates/

## Completion Criteria

Scenario: decision steps ask the judge and record typed answers
  Test: decision steps ask the judge and record typed answers
  Then a stubbed ask returns typed rows and the step passes with answers recorded

Scenario: decision steps skip loudly when the judge is unavailable
  Test: decision steps skip loudly when the judge is unavailable
  Then a skipped ask yields status skipped with the judge reason recorded

Scenario: decision assertions fail the step below the confidence threshold
  Test: decision assertions fail the step below the confidence threshold
  Then min_confidence, equals and in assertions fail the step on unmet answers
