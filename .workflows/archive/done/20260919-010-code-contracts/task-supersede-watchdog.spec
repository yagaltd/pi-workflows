spec: task
name: "extension supersede watchdog (mechanical trigger + advisory Jev routing)"
tags: [extension, watchdog, jev, adr, supersede]
max-rounds: 3
verify: bun test tests/ && grep -q "supersede" extensions/index.ts
---

## Intent

Extension watchdog for the ADR supersede trigger (proposal step 6, unlocked by T7p GO): a MECHANICAL trigger (task diff touches an adr:-attributed contract's file, or a spec's Decisions section changed while no new ADR file exists) injects ONE advisory line naming the seam and — when typesafe is reachable — the Jev supersede question's probability. Never edits, never gates; remind-once discipline like the existing watchdogs.

## Decisions (evidence: reviews/task-7p.md + spike report)

- Trigger is pure grep/diff mechanics (no model); the Jev call is ROUTING ONLY — choice probability ≥0.90 for supersedes/contradicts names the human gate; below → static advisory line naming the seam.
- Never edits files, never blocks dispatch, never marks anything — injects at most one advisory line per new gap (no-spam precedent: existing watchdogs).
- typesafe-unavailable (authState) → static line only, no crash, no WARN spam.
- Unit tests cover the fires/not-fires matrix, no-spam, and the unavailable fallback (example-based; existing tests/extension.test.ts patterns).
- Reads @cc metadata from CONTRACTS/extension files via existing cc-check list when available; falls back to scanning for adr: attributes textually when not installed.

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/extension.test.ts

### Forbidden
- everything else, incl. agents/, templates/, skills/, models/, scripts/, README.md

## Completion Criteria

Scenario: Trigger implemented
  Test: grep -q "supersede" extensions/index.ts
  Given extensions/index.ts at HEAD
  When the edit lands
  Then the watchdog names the trigger conditions (adr:-attributed file touched OR Decisions changed with no new ADR)

Scenario: Advisory routing with threshold
  Test: grep -q "0.90" extensions/index.ts
  Given the Jev routing
  When the choice probability is at or above 0.90 for supersedes/contradicts
  Then the injected line names the human gate — and never edits/blocks otherwise

Scenario: Test suite covers the matrix
  Test: bun test tests/ && grep -c "supersede" tests/extension.test.ts
  Given tests/extension.test.ts
  When bun test runs
  Then all tests pass AND the supersede watchdog has fire/no-fire/no-spam/unavailable test cases (grep count ≥ 3 mentions)

Scenario: Typesafe-unavailable fallback
  Test: grep -B3 -A6 "authState\|unavailable\|static" extensions/index.ts | grep -qi "static"
  Given typesafe is unreachable
  When the trigger fires
  Then a static advisory line is injected (no crash, no throw) — verified by a unit test

Scenario: Negative — no new authority
  Test: bash -c '[ "$(grep -c "hygiene\|watchdog" extensions/index.ts)" -gt 0 ] && ! grep -q "ok: true" extensions/index.ts'
  Given the extension's mechanical scope
  When the edit lands
  Then the extension still emits no verdicts of any kind — advisory lines only
