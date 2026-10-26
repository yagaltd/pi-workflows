spec: task
name: "intent-hook-docs-queue-release"
tags: [docs, queue, release]
max-rounds: 2
---

## Intent

README documents the hook, the queue drops the shipped C row, release
v0.11.1.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json
- .workflows/queue.json
- tests/intent-wiring.test.ts

### Forbidden
- scripts/, extensions/

## Completion Criteria

Scenario: readme documents the intent-guard suggestion hook
  Test: readme documents the intent-guard suggestion hook
  Then README names the hook conditions, the routes, and the fail-open rule

Scenario: queue json drops the shipped c row
  Test: queue json drops the shipped c row
  Then queue.json has no C row and D carries recommend next
