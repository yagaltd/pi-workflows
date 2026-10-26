spec: task
name: "flows-examples-skill-docs"
tags: [flows, docs, examples]
max-rounds: 2
---

## Intent

Two example flows, the `flows` skill (format + run documentation), README
section, CHANGELOG v0.9.0, version bump.

## Decisions

- Examples: `two-phase-tdd` (tester → test-quality gate → worker → review
  gate) and `docs-ship` (docs task → review gate).
- README Flows section names its validating gate (claim-to-gate rule).

## Boundaries

### Allowed Changes
- .workflows/flows/
- skills/flows/
- README.md
- CHANGELOG.md
- package.json
- tests/flows-examples.test.ts

### Forbidden
- scripts/ (tasks 1–3 own them)
- extensions/index.ts, prompts/

## Completion Criteria

Scenario: example flows validate and dry-run clean
  Test: example flows validate and dry-run clean
  Then both examples pass the validator and flow-run --dry-run exits 0

Scenario: flows skill and readme document the format
  Test: flows skill and readme document the format
  Then the skill documents steps, gates and flow-run, and README names the validating gate
