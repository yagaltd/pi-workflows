spec: task
name: "resume-ship"
tags: []
---

## Intent

Ship v0.12.8: CHANGELOG entry for the resume digest, version bump 0.12.7 → 0.12.8. Full gate chain (drift includes the profile-lint section).

## Decisions

- CHANGELOG head entry: `2026-10-29 — v0.12.8: resume digest — mechanical restart (plan 20261026-042)`.
- package.json 0.12.7 → 0.12.8.

## Boundaries

### Allowed Changes
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `scripts/**`, `prompts/**`, `skills/**`, `extensions/**`, README.

## Completion Criteria

Scenario: changelog carries the v0.12.8 entry
  Test: grep -q "v0.12.8: resume digest" CHANGELOG.md && grep -q "mechanical restart" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-29, titled with v0.12.8 resume digest

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.8' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.8
