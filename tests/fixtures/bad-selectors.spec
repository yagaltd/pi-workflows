spec: task
name: "Bad selector fixtures"
tags: [fixture, selector-lint]
---

## Intent

Fixture for `scripts/check-spec-selectors.sh` carrying at least three distinct
selector defect classes: a shell syntax error, a non-numeric grep context flag,
and an empty pattern. The lint must reject this file (exit 1) with one
`file:line: <finding>` line per defect.

## Decisions

- Defect classes are intentional and must never be "fixed" to make the fixture pass
- Every selector is still parse-only input — the lint never executes it

## Boundaries

### Allowed Changes
- tests/fixtures/bad-selectors.spec

### Forbidden
- everything else

## Completion Criteria

Scenario: shell syntax error
  Test: grep -q 'unterminated src/index.ts
  Given a selector with an unclosed quote
  When the lint parses it
  Then a shell syntax finding is emitted

Scenario: non-numeric context flag
  Test: grep -A x 'needle' src/index.ts
  Given a selector whose `-A` value is not numeric
  When the lint parses it
  Then a context-flag finding is emitted

Scenario: empty pattern
  Test: grep -q '' src/index.ts
  Given a selector with an empty grep pattern
  When the lint parses it
  Then an empty-pattern finding is emitted

Scenario: missing pattern-file path
  Test: grep -f '' src/index.ts
  Given a selector whose `-f` path is empty
  When the lint parses it
  Then a pattern-file-path finding is emitted