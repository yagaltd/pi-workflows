spec: task
name: "tdd-guard-assertionless-parser-fix"
tags: []
---

## Intent

Fix `no-assertionless-tests` parser false positives in tdd-guard v0.1.0: four statement shapes are falsely flagged as assertion-free when they contain real `expect()` calls — destructuring-from-call statements, template-literal interpolation in test bodies, nested object/array literals, unicode identifiers. Repro evidence: pi-workflows `tests/extension.test.ts` base 25 → 22 violations, all false. Fix the parser/rule, add per-class regression fixtures, bump 0.1.0 → 0.1.1.

## Decisions

- The acorn-based AST parser fix ALREADY EXISTS on the `github/tdd-guard` clone (HEAD 6b6ae4f, "no-assertionless-tests false positives eliminated 49→0 on MorphClient") — the installed binary links the stale `vibe/tdd-guard` build. This task VERIFIES the fix covers the four documented classes plus the 22-case acceptance corpus, adds any missing per-class fixtures, bumps 0.1.0 → 0.1.1, and leaves install/rollout to TASK 4.
- The rule fails a test only when NO assertion call (`expect`/`assert`-family) appears anywhere in the test body AST — including inside callbacks, destructured-call continuations, and template-literal-expressed conditions.
- Parser must tolerate: `const { a } = call()`, backtick templates with `${}` interpolation, deeply nested literals, non-ASCII identifiers.
- True positives stay failing: a test with zero assertion calls of any kind still reports.
- Each false-positive class becomes a fixture pair (source + expected-clean) in the test suite; the 22 real pi-workflows cases become an acceptance fixture file.

## Boundaries

### Allowed Changes
- src/rules/no-assertionless-tests.ts
- src/parser.ts
- test/**
- package.json

### Forbidden
- Do not change `verify.ts` or the CLI surface (a separate task owns behavior there).
- Do not weaken other rules.
- Do not add dependencies.

## Completion Criteria

Scenario: handles destructuring-from-call statements as asserted tests
  Test: handles destructuring from call statements as asserted tests
  Given a test body containing `const { a } = call()` followed by expect(a)
  When the lint rule runs
  Then no no-assertionless-tests finding is reported

Scenario: handles template interpolation in test bodies
  Test: handles template interpolation in test bodies
  Given a test body containing backtick templates with interpolation around expect calls
  When the lint rule runs
  Then no false positive is reported

Scenario: handles nested object and array literals
  Test: handles nested object and array literals
  Given a test body with deeply nested literals containing expect calls
  When the lint rule runs
  Then no false positive is reported

Scenario: handles unicode identifiers
  Test: handles unicode identifiers
  Given a test using non-ASCII identifier names with expect calls
  When the lint rule runs
  Then no false positive is reported

Scenario: still flags truly assertionless tests
  Test: still flags truly assertionless tests
  Given a test body with zero assertion calls
  When the lint rule runs
  Then the finding is reported
