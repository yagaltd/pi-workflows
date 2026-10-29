spec: task
name: "scaffold-docs-ship"
tags: []
---

## Intent

Ship v0.12.9: docs for the scaffold mechanism (README tooling note; DOCS-POLICY profile-section sentence: scaffold kinds are profile data, templates are per-project files — language-agnostic), CHANGELOG v0.12.9, version bump 0.12.8 → 0.12.9.

## Decisions

- README: one tooling line near the scripts/tooling mention: `bash scripts/scaffold.sh <kind> <name>` generates profile-declared artifacts (ADR entries first).
- DOCS-POLICY: the profile section gains one sentence — scaffold kinds live in `.workflows/profile.json`; template files are per-project (no baked languages).
- CHANGELOG head entry: `2026-10-29 — v0.12.9: scaffolds — profile-declared generators (plan 20261026-043)`.
- package.json 0.12.8 → 0.12.9.

## Boundaries

### Allowed Changes
- README.md
- templates/DOCS-POLICY.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `scripts/**`, `.workflows/profile.json`, `templates/ADR.md` (TASK 1 landed), `extensions/**`, `prompts/**`.

## Completion Criteria

Scenario: readme carries the tooling note
  Test: grep -q "scaffold.sh" README.md
  Given README.md after the change
  When the tooling area is inspected
  Then the scaffold command is documented

Scenario: docs policy names the stance
  Test: grep -q "profile data" templates/DOCS-POLICY.md && grep -qi "per-project" templates/DOCS-POLICY.md
  Given templates/DOCS-POLICY.md after the change
  When the profile section is inspected
  Then scaffold kinds are named profile data and templates per-project

Scenario: changelog carries the v0.12.9 entry
  Test: grep -q "v0.12.9: scaffolds" CHANGELOG.md && grep -q "profile-declared generators" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-29, titled with v0.12.9 scaffolds

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.9' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.9
