spec: task
name: "agents-doctrine-ship"
tags: []
---

## Intent

Ship v0.12.6: CHANGELOG entry for the agents-doctrine plan, version bump 0.12.5 → 0.12.6. Full gate chain.

## Decisions

- CHANGELOG head entry: `2026-10-29 — v0.12.6: agents-doctrine — AGENTS.md core + pointers + lint (plan 20261026-040)`.
- package.json 0.12.5 → 0.12.6.

## Boundaries

### Allowed Changes
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `templates/**`, `skills/**`, `scripts/**`, `AGENTS.md`, `extensions/**`.

## Completion Criteria

Scenario: changelog carries the v0.12.6 entry
  Test: grep -q "v0.12.6: agents-doctrine" CHANGELOG.md && grep -q "agents-lint" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-29, titled with v0.12.6 agents-doctrine

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.6' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.6
