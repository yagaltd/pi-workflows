spec: task
name: "intent-tier-docs-release"
tags: [docs, routing, release]
max-rounds: 2
---

## Intent

/add routes three bins; the plan interview opens with the tier question;
README documents the intent tier with origin note; release v0.12.1.

## Boundaries

### Allowed Changes
- prompts/add.md
- skills/plan/SKILL.md
- README.md
- CHANGELOG.md
- package.json
- tests/tier-wiring.test.ts

### Forbidden
- scripts/, extensions/

## Completion Criteria

Scenario: add prompt routes problem solution and procedure to the right command
  Test: add prompt routes problem solution and procedure to the right command
  Then add.md names the three bins and their commands and the plan skill carries the tier question

Scenario: readme documents the intent tier question
  Test: readme documents the intent tier question
  Then README names tier problem solution procedure and the origin note
