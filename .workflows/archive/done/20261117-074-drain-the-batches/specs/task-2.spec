spec: task
name: parser-conditional-idiom
tags: [tdd-guard, parser]
verify: "bunx vitest run && bunx tsc --noEmit && bunx tsc"
max-rounds: 2
---

## Intent

Conditional test-wrapper idioms — test.skipIf(cond)(name, fn),
test.runIf(...), test.each(...)(...) — extract as real named tests with their
assertions, so wrapper-heavy suites (pi-workflows' requireLiveState pattern)
stop producing assertionless false positives.

## Decisions

- Unwrap happens at extraction: member-call chains on test (skipIf, runIf,
  each, fails, todo-only-if-marked-todo) resolve to the inner test call; the
  extracted block carries the inner name and body.
- Negative pin is mandatory: a genuinely empty body inside the idiom stays
  flagged (no weakening of no-assertionless-tests).
- E2E proof: lint over a fixture replicating pi-workflows'
  requireLiveState-wrapped tests yields zero assertionless violations for
  wrapped-with-assertions cases.
- Version drift killed permanently (third occurrence: 0.1.4, 0.1.6): src/cli.ts
  derives --version from package.json at runtime; the hardcoded .version()
  literal is removed. Pin: no version literal remains and package.json is read.

## Boundaries

### Allowed Changes
- src/parser.ts
- src/lint.ts
- src/cli.ts
- tests/**
- CHANGELOG.md
- package.json
- package-lock.json
- dist/**

### Forbidden
- Rule semantics (no-assertionless-tests still flags empty bodies)
- src/discovery.ts, src/verify.ts (T1's lane)

## Completion Criteria

Scenario: skipIf idiom extracts with assertions
  Test: parser_unwraps_skipif_idiom_with_assertions
  Given a fixture using test.skipIf(cond)("name", () => { expect(...) })
  When the parser extracts test blocks
  Then the block carries the name and counts as asserted (today: anonymous assertionless — red first)

Scenario: empty body inside the idiom stays flagged
  Test: parser_still_flags_empty_body_inside_idiom
  Given test.skipIf(cond)("name", () => { /* nothing */ })
  When extracted
  Then the no-assertionless rule still fires (negative pin)

Scenario: the other wrappers unwrap too
  Test: parser_unwraps_runif_each_fails
  Given runIf/each/fails variants with assertions
  When extracted
  Then all carry name + asserted

Scenario: the cli version derives from package.json
  Test: test_cli_version_derives_from_package_json
  Given src/cli.ts after the change
  When read
  Then no hardcoded version literal remains and package.json is read at
  startup for --version (the string-drift class dies here)

Scenario: gates hold
  Test: tsc_and_build_clean
  When bunx tsc --noEmit and bunx tsc run
  Then both exit 0
