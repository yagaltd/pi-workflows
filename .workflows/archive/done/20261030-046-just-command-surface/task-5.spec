spec: task
name: "changelog-version-046"
tags: [release, changelog, version]
verify: "grep -q '\"version\": \"0.14.0\"' package.json && grep -q '046' CHANGELOG.md"
---

## Intent

Record plan 20261030-046 as the house release pre-work: CHANGELOG entry for the just command surface plan and the minor version bump to 0.14.0.

## Decisions

- Version: 0.13.1 → 0.14.0 (minor — new tooling surface, house precedent: new capability plans bump minor).
- One CHANGELOG entry documents: justfile adoption (seven recipes), CI parity via `just ci`, pre-push rewire with loud degradation, doc-gate guidance in flows SKILL + AGENTS.md pointer.
- agent-ci is named as explicitly rejected (origin note), not silently omitted.

## Boundaries

### Allowed Changes
- CHANGELOG.md
- package.json

### Forbidden
- Do not modify docs/, README.md, or any scripts
- Do not bump dependencies
- Do not archive the plan (SHIP owns archiving)

## Completion Criteria

Scenario: version reads 0.14.0
  Test: grep -q '"version": "0.14.0"' package.json
  Given package.json after the edit
  When reading the version field
  Then it is exactly 0.14.0

Scenario: changelog carries the plan entry
  Test: grep -q '046' CHANGELOG.md
  Given CHANGELOG.md after the edit
  When reading the newest section
  Then one entry references plan 20261030-046 and names the four changes (justfile, ci parity, pre-push, guidance)

Scenario: changelog notes the rejected alternative
  Test: grep -qi 'agent-ci' CHANGELOG.md
  Given the same entry
  When reading it
  Then it states agent-ci was rejected (Docker cost, one-shell-job CI) as an origin note

Scenario: negative — diff touches only the version line
  Test: test -z "$(git diff HEAD -- package.json | grep -E '^[+-]' | grep -v -e 'version' -e '^[+-][+-]')"
  Given package.json after the edit
  When diffing against HEAD
  Then the only +/- line is the version field — dependencies and scripts are untouched
