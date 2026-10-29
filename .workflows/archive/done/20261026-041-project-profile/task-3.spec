spec: task
name: "profile-ship"
tags: []
---

## Intent

Ship v0.12.7: CHANGELOG entry for the project-profile plan, version bump 0.12.6 → 0.12.7. Full gate chain (drift now includes the profile-lint section).

## Decisions

- CHANGELOG head entry: `2026-10-29 — v0.12.7: project profile — machine-readable project facts (plan 20261026-041)`.
- package.json 0.12.6 → 0.12.7.

## Boundaries

### Allowed Changes
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `scripts/**`, `skills/**`, `.workflows/profile.json`, `extensions/**`, `templates/**`.

## Completion Criteria

Scenario: changelog carries the v0.12.7 entry
  Test: grep -q "v0.12.7: project profile" CHANGELOG.md && grep -q "profile-lint" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-29, titled with v0.12.7 project profile

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.7' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.7
