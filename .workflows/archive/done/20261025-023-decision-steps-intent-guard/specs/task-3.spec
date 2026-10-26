spec: task
name: "decision-docs-example-release"
tags: [flows, decision, intent-guard, docs]
max-rounds: 2
---

## Intent

Document both surfaces, ship a decision-step example flow, bump to v0.9.1.

## Decisions

- Example `decision-demo.json`: decision step (route kind) → transform.
- README gains decision-step + intent-guard paragraphs naming their gates;
  flows skill documents the decision kind and the guard CLI.

## Boundaries

### Allowed Changes
- .workflows/flows/
- skills/flows/
- README.md
- CHANGELOG.md
- package.json
- tests/decision-docs.test.ts

### Forbidden
- scripts/ (tasks 1–2 own them)
- extensions/index.ts, prompts/

## Completion Criteria

Scenario: flows skill and readme document decision steps and intent-guard
  Test: flows skill and readme document decision steps and intent-guard
  Then the skill documents the decision kind and guard CLI, and README names their gates

Scenario: examples ship a decision flow and validate clean
  Test: examples ship a decision flow and validate clean
  Then decision-demo.json validates and dry-runs clean
