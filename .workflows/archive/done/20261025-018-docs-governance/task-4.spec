spec: task
name: "canon-drift-fix-docs-ship"
tags: []
---

## Intent

Fix the canon's own drift (the motivating example) and ship v0.8.3: `docs/canon.md` rule 2 cites "doc-drift gate, backlog item 4" — stale since the 2026-10-24 backlog reorder (the doc-drift gate is item 5). Update the reference to the shipped gate, document the pre-push hook in README, add the CHANGELOG entry, bump 0.8.2 → 0.8.3.

## Decisions

- Canon rule 2 reference becomes: "Expired stamps are drift (doc-drift gate, plan 20261025-018)." — plan-anchored, not backlog-number-anchored (backlog numbers reorder; plan IDs do not).
- README: short section under How It Works — doc-drift sections in docs-lint (stamps, claim-to-gate) + the optional pre-push hook installer.
- CHANGELOG head entry: `2026-10-25 — v0.8.3: docs governance — doc-drift gate + proposal template + archive gate (plan 20261025-018)`.
- package.json 0.8.2 → 0.8.3.

## Boundaries

### Allowed Changes
- docs/canon.md
- README.md
- CHANGELOG.md
- package.json
- scripts/install-git-hooks.sh (D3 — 6-line hook installer; amended 2026-10-25, was unassigned)

### Forbidden
- Do not touch `scripts/**` (T1/T3 landed), `templates/**`, `prompts/**`, `skills/**`, `agents/**`, `extensions/**`, `tests/**`.
- Do not alter canon rules 1, 3, 4, 5.

## Completion Criteria

Scenario: canon rule 2 cites the shipped gate without the stale number
  Test: grep -q "plan 20261025-018" docs/canon.md && ! grep -q "backlog item 4" docs/canon.md
  Given docs/canon.md after the change
  When rule 2 is inspected
  Then the drift reference anchors to plan 20261025-018
  And the stale backlog item 4 citation is gone

Scenario: readme documents the drift gate and hook
  Test: grep -q "doc-drift" README.md && grep -q "install-git-hooks" README.md
  Given README.md after the change
  When the docs section is inspected
  Then the stamp + claim-to-gate sections are named
  And the optional pre-push installer is documented

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.8.3' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.8.3
