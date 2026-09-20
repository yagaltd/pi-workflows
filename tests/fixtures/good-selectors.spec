spec: task
name: "Good selector fixtures"
tags: [fixture, selector-lint]
---

## Intent

Fixture for `scripts/check-spec-selectors.sh` whose every `Test:` selector is
well-formed: parse-clean under `bash -n`, numeric grep context flags, no empty
pattern, and a `-f` pattern file path that is present. The lint must accept this
file silently (exit 0).

## Decisions

- `grep -A6` (attached numeric) and `grep -B 2` (separated numeric) both appear
- One compound selector chains commands with `&&` (no `bash -c`, no subshell)
- All referenced paths are post-work paths — this file is only parsed, never run

## Boundaries

### Allowed Changes
- tests/fixtures/good-selectors.spec

### Forbidden
- everything else

## Completion Criteria

Scenario: attached numeric context flag
  Test: grep -A6 -q 'create table' migrations/001.sql
  Given a selector with `-A6`
  When the lint parses it
  Then no finding is emitted

Scenario: compound selector with separated context flag
  Test: bun test tests/one.test.ts && grep -B 2 -q 'ok' README.md
  Given a compound selector whose grep uses `-B 2`
  When the lint parses it
  Then no finding is emitted

Scenario: pattern-file reference present
  Test: grep -f patterns.txt -q src/index.ts
  Given a selector that names a non-empty pattern file with `-f`
  When the lint parses it
  Then no finding is emitted

Scenario: plain command selector
  Test: bun test tests/thing.test.ts
  Given a selector with no grep flags at all
  When the lint parses it
  Then no finding is emitted