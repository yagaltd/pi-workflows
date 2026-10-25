spec: task
name: "readme-changelog-v080"
tags: []
---

## Intent

Document plan 015's shipped mechanics for readers: README gains the dispatcher and auto-gate sections (what they do, degradation semantics), CHANGELOG gains the v0.8.0 entry. Version bump to 0.8.0 in package.json.

## Decisions

- README: one subsection under How It Works for the dispatcher (deterministic task selection, thin /next, cache-affinity ordering) and one for the auto-gate hook (write-time Layer 1 + Layer 2 chain, block vs advisory semantics, docs exemption).
- CHANGELOG: head entry `2026-10-25 — v0.8.0: dispatch + gate mechanics (plan 20261025-015)` with bullets: dispatcher resolveNext, cache-affinity ordering, thin /next, ledger cache% column, auto-gate hook semantics.
- package.json version → 0.8.0.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `extensions/**`, `scripts/**`, `agents/**`, `skills/**`, `prompts/**`.
- Do not alter the README Commands table rows (check-drift section 7 validates them).

## Completion Criteria

Scenario: changelog carries the v0.8.0 entry
  Test: grep -q "v0.8.0: dispatch + gate mechanics" CHANGELOG.md && grep -q "resolveNext" CHANGELOG.md && grep -q "auto-gate" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-25 and titled with v0.8.0 dispatch + gate mechanics
  And it bullets the dispatcher, cache-affinity, and auto-gate hook

Scenario: readme documents dispatcher and auto-gate
  Test: grep -q "resolveNext" README.md && grep -q "auto-gate" README.md
  Given README.md after the change
  When How It Works is inspected
  Then the dispatcher subsection explains deterministic selection and thin /next
  And the auto-gate subsection explains write-time blocking and the advisory path

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.8.0' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.8.0
