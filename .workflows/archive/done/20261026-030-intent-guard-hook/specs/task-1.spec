spec: task
name: "intent-guard-systemone-shape"
tags: [intent-guard, judge, systemone]
max-rounds: 2
---

## Intent

`classify` asks one systemone-native question: kind (choice over current_spec,
amend_needed, unrelated, clarification). Confidence and probabilities come
from the choice answer. Number-schema questions are gone.

## Decisions

- routeFor unchanged (amend/answer/proceed/ask; threshold default 0.85).
- classify returns {route, kind, confidence, probabilities?, skipped}.
- Trail lines carry route, kind, confidence, threshold, probabilities.

## Boundaries

### Allowed Changes
- scripts/intent-guard.mjs
- tests/intent-guard.test.ts

### Forbidden
- extensions/index.ts, scripts/judge.mjs, prompts/

## Completion Criteria

Scenario: intent-guard classifies queries against the live plan
  Test: intent-guard classifies queries against the live plan
  Then classify builds one kind question naming live tasks and maps the choice answer to a route

Scenario: intent-guard reads confidence from the choice answer
  Test: intent-guard reads confidence from the choice answer
  Then confidence comes from the kind row confidence field and probabilities flow to the trail

Scenario: main appends the trail and always exits 0 fail-open
  Test: main appends the trail and always exits 0 fail-open
  Then main writes a trail line with the verdict and returns 0 on skip paths
