spec: task
name: "intake-docs-ship"
tags: []
---

## Intent

Document the casual intake flow and ship v0.8.4: README gains the intake section (idea/brainstorm → typed candidate blocks → `--check` → human review → import), CHANGELOG gains the v0.8.4 entry, package.json bumps 0.8.3 → 0.8.4.

## Decisions

- README: one subsection under How It Works — Casual intake (v0.8.4): the intake path, the check-first verify, the human-approval-only import, the rejected-block audit trail.
- CHANGELOG head entry: `2026-10-25 — v0.8.4: casual intake — typed candidate requirements (plan 20261025-019)` with bullets: intake emitter in idea/brainstorm, marked-block format via the fork import surface, check-first human-gated import.
- package.json 0.8.3 → 0.8.4.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `prompts/**`, `scripts/**`, `agents/**`, `skills/**`, `tests/**`, `extensions/**`.
- Do not alter the README Commands table rows (check-drift section 7 validates them).

## Completion Criteria

Scenario: changelog carries the v0.8.4 entry
  Test: grep -q "v0.8.4: casual intake" CHANGELOG.md && grep -q "requirements import" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-25, titled with v0.8.4 casual intake
  And it bullets the intake emitter, the marked-block format, and the check-first import

Scenario: readme documents the intake flow
  Test: grep -q ".workflows/intake/" README.md && grep -q "human review" README.md
  Given README.md after the change
  When the intake section is inspected
  Then it names the intake path, the check-first verify, and the human-approval-only import

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.8.4' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.8.4
