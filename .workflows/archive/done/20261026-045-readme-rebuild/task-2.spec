spec: task
name: "readme-rebuild-ship"
tags: []
---

## Intent

Ship v0.13.1: the DOCS-POLICY closure sentence (README ≤ ~200 lines; architecture narration belongs to docs/architecture.md; history belongs to CHANGELOG — the bound that was missing while the bloat grew), CHANGELOG v0.13.1, version bump 0.13.0 → 0.13.1. Full gate chain (10 sections).

## Decisions

- DOCS-POLICY README section gains the budget + placement sentence after the freshness gate paragraph.
- CHANGELOG head entry: `2026-10-29 — v0.13.1: readme-rebuild — shop window only (plan 20261026-045)`.
- package.json 0.13.0 → 0.13.1.

## Boundaries

### Allowed Changes
- templates/DOCS-POLICY.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `README.md`, `docs/**` (TASK 1 landed), `scripts/**`, `skills/**`, `extensions/**`.

## Completion Criteria

Scenario: doctrine carries the bound
  Test: grep -q "200" templates/DOCS-POLICY.md && grep -q "docs/architecture.md" templates/DOCS-POLICY.md
  Given templates/DOCS-POLICY.md after the change
  When the README section is inspected
  Then the line budget and the narration placement bound appear

Scenario: changelog carries the v0.13.1 entry
  Test: grep -q "v0.13.1: readme-rebuild" CHANGELOG.md && grep -q "shop window" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-29, titled with v0.13.1 readme-rebuild

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.13.1' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.13.1
