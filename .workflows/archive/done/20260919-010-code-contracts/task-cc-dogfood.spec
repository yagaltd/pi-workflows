spec: task
name: "dogfood — repo CONTRACTS + @cc on extension seams"
tags: [cc-check, dogfood, extension]
max-rounds: 2
verify: cc-check format && test -f CONTRACTS
---

## Intent

Prove the code-contracts format on ourselves before recommending it to consumers: a `CONTRACTS` file at repo root carrying 3–5 REAL repo rules (verbatim doctrine, not invented), and `@cc` directives on the extension's exported seams in extensions/index.ts with invariants taken from their existing doc comments.

## Decisions

- CONTRACTS rules are drawn from EXISTING doctrine — at minimum: (1) role substitution is mechanical/verbatim via `@role:`, (2) reviewer verdicts never contain judgment (mechanical-only), (3) verdict gating = reviewer-only authority (no model marks its own work done), (4) watchdogs remind once per new gap (no spam).
- Each CONTRACTS rule carries a `label:` attribute; `@cc` directives on extension functions carry `label:` and stable kebab IDs.
- Invariants on extension seams restate what the function's own doc comment already claims — no new policy invented in this task.
- cc-check 0.2.0 (installed, pinned in README by TASK 1) is the syntax authority: `cc-check format` must exit 0.

## Boundaries

### Allowed Changes
- CONTRACTS
- extensions/index.ts

### Forbidden
- everything else, incl. agents/*.md, templates/, skills/, tests/, README.md, .workflows/

## Completion Criteria

Scenario: CONTRACTS file exists with 3–5 real rules
  Test: bash -c 'n=$(grep -c "^@cc" CONTRACTS); [ "$n" -ge 3 ] && [ "$n" -le 5 ]'
  Given the repo root
  When the file lands
  Then CONTRACTS contains between 3 and 5 @cc directives, each with prose

Scenario: Every rule carries a label attribute
  Test: bash -c '[ "$(grep -c "^@cc \[" CONTRACTS)" = "$(grep -c "^@cc" CONTRACTS)" ]'
  Given the CONTRACTS directives
  When cc-check parses them
  Then every directive has bracketed metadata including a label

Scenario: Syntax gate passes repo-wide
  Test: cc-check format
  Given CONTRACTS and the @cc-annotated extensions/index.ts
  When cc-check format runs at repo root
  Then it exits 0 — no malformed directives, no duplicate IDs

Scenario: Extension seams annotated
  Test: bash -c 'n=$(grep -c "@cc" extensions/index.ts); [ "$n" -ge 2 ]'
  Given extensions/index.ts exports (roleBody + watchdog entry points)
  When the edit lands
  Then at least 2 exported functions carry @cc contract comments whose prose matches their existing doc-comment claims (mechanical substitution; once-per-gap reminder)

Scenario: Negative — no contract noise outside scope
  Test: bash -c '! grep -rq "@cc" tests/ skills/ agents/ templates/'
  Given the finished edit
  When the repo is scanned
  Then no @cc directives leaked into tests/, skills/, agents/, or templates/ — durable-invariant annotations exist only in CONTRACTS and extensions/index.ts
