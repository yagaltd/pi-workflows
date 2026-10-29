spec: task
name: "review-extraction-docs-ship"
tags: []
---

## Intent

Ship v0.12.4: CHANGELOG entry for the /review SKILL extraction, version bump 0.12.3 → 0.12.4, README `/review` row mechanism note. No behavior change (TASK 1 was a pure extraction).

## Decisions

- README `/review` row gains the mechanism note: flow lives in `skills/review/SKILL.md`.
- CHANGELOG head entry: `2026-10-26 — v0.12.4: review-mirror — /review SKILL extraction (plan 20261026-038)`.
- package.json 0.12.3 → 0.12.4.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `skills/review/**`, `prompts/review.md` (TASK 1 landed), `extensions/**`, `scripts/**`.

## Completion Criteria

Scenario: changelog carries the v0.12.4 entry
  Test: grep -q "v0.12.4: review-mirror" CHANGELOG.md && grep -q "SKILL extraction" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-26, titled with v0.12.4 review-mirror

Scenario: readme row notes the mechanism
  Test: grep -q "skills/review/SKILL.md" README.md
  Given README.md after the change
  When the /review row is inspected
  Then it names the SKILL home

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.4' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.4
