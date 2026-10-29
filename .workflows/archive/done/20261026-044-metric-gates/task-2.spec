spec: task
name: "metric-gates-docs-ship"
tags: []
---

## Intent

Ship v0.13.0: docs for the metric gates (README tooling/install pointers under our gate names, origin note ub-mode companion tools), CHANGELOG v0.13.0, version bump 0.12.9 → 0.13.0.

## Decisions

- README: tooling lines — complexity gate / duplication gate / mutation gate (`bash scripts/metric-gates.sh [--with-mutation]`); install pointers to the companion tool repos (origin note: ub-mode companion tools, renamed at adoption); graceful-skip stated.
- CHANGELOG head entry: `2026-10-29 — v0.13.0: metric gates — mechanical quality thresholds (plan 20261026-044)`.
- package.json 0.12.9 → 0.13.0.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `scripts/**`, `.workflows/profile.json`, `skills/**`, `extensions/**`, `templates/**`.

## Completion Criteria

Scenario: readme carries the gates
  Test: grep -q "metric-gates.sh" README.md && grep -qi "graceful" README.md
  Given README.md after the change
  When the tooling area is inspected
  Then the three gate names, the script, the install pointers, and the graceful-skip behavior appear

Scenario: changelog carries the v0.13.0 entry
  Test: grep -q "v0.13.0: metric gates" CHANGELOG.md && grep -q "mechanical quality thresholds" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-29, titled with v0.13.0 metric gates

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.13.0' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.13.0
