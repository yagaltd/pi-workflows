spec: task
name: "lessons-wiring-queue-release"
tags: [lessons, wiring, queue, release]
max-rounds: 2
---

## Intent

Pin the wiring with tests, drop the shipped D row from the queue, release
v0.11.2.

## Boundaries

### Allowed Changes
- tests/lessons-prompt.test.ts
- .workflows/queue.json
- CHANGELOG.md
- package.json

### Forbidden
- skills/, scripts/, prompts/

## Completion Criteria

Scenario: queue json drops the shipped d row
  Test: queue json drops the shipped d row
  Then queue.json has no D row and E remains later with all columns intact
