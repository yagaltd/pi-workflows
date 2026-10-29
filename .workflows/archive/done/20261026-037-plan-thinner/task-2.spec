spec: task
name: "plan-thinner-docs-ship"
tags: []
---

## Intent

Ship v0.12.3: CHANGELOG entry for the plan-thinner refactor, version bump 0.12.2 → 0.12.3. No README change (the /plan row's user-facing behavior is unchanged). Full gate chain.

## Decisions

- CHANGELOG head entry: `2026-10-26 — v0.12.3: plan-thinner — /plan SKILL as sole flow authority (plan 20261026-037)` with bullets: prompt-unique flow moved into the SKILL (judge pre-flight + PROPOSAL-FORMAT pointer), thin prompt ≤ 25 lines, no behavior change.
- package.json 0.12.2 → 0.12.3.

## Boundaries

### Allowed Changes
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `skills/**`, `prompts/**` (TASK 1 landed), README, `extensions/**`, `scripts/**`.

## Completion Criteria

Scenario: changelog carries the v0.12.3 entry
  Test: grep -q "v0.12.3: plan-thinner" CHANGELOG.md && grep -q "sole flow authority" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-26, titled with v0.12.3 plan-thinner
  And it bullets the move and the thin prompt

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.3' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.3
