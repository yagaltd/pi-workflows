spec: task
name: "judge-layer-docs-ship"
tags: []
---

## Intent

Document the judge layer and ship v0.8.2: README gains the judge section (config, degradation), CHANGELOG gains the v0.8.2 entry, package.json bumps 0.8.1 → 0.8.2. The whole-plan gate chain runs in NO-JUDGE mode — the degradation path is the tested path.

## Decisions

- README: one subsection under How It Works — the judge (config via `TYPEDLLM_API_KEY`/`TYPEDLLM_BASE_URL`, flag-only semantics, `JUDGE SKIPPED` degradation, audit location).
- CHANGELOG head entry: `2026-10-25 — v0.8.2: judge layer — contract pre-flight + verdict compaction (plan 20261025-017)` with bullets: judge client, pre-flight wiring, wave-settle compaction, NO-JUDGE degradation as tested default.
- package.json 0.8.1 → 0.8.2.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json

### Forbidden
- Do not touch `extensions/**`, `scripts/**`, `agents/**`, `skills/**`, `prompts/**`.
- Do not alter the README Commands table rows (check-drift section 7 validates them).

## Completion Criteria

Scenario: changelog carries the v0.8.2 entry
  Test: grep -q "v0.8.2: judge layer" CHANGELOG.md && grep -q "judge.mjs" CHANGELOG.md
  Given CHANGELOG.md after the change
  When the head entry is inspected
  Then it is dated 2026-10-25, titled with v0.8.2 judge layer
  And it bullets the client, pre-flight wiring, compaction, and the NO-JUDGE default

Scenario: readme documents the judge
  Test: grep -q "TYPEDLLM_API_KEY" README.md && grep -q "JUDGE SKIPPED" README.md
  Given README.md after the change
  When the judge section is inspected
  Then it names the env config, the flag-only semantics, and the degradation

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.8.2' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.8.2
