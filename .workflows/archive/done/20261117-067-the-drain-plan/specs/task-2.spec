spec: task
name: ledger-doctrine-wiring
tags: [doctrine, ledger, process]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

The follow-up table becomes the mandatory end of every ship report, plans must
drain the ledger before growing, and no report goes out while a spawned run is
non-terminal.

## Decisions

- `templates/FOLLOW-UP-TABLE.md` gains ONE pinned column, `Origin` — `planned`
  or `new (<why>)` — with the amendment dated in the template text, plus the
  three-exit-state rule: every row reaches done, closed(reason) or
  deferred(trigger: ...) before a new plan opens; a row that cannot state
  impact and value is DELETED, not queued.
- `agents/registry.md` orchestrator doctrine gains: (a) the ship report ends
  with the follow-up table — mandatory, bounded, no open item mentioned in
  prose outside it; (b) Terminal-before-report: before any completion or ship
  post, enumerate every spawned run; each must be terminal with its result
  consumed via subagent_result — first-hand words, never second-hand citation.
- `skills/plan/SKILL.md` gains the `## Ledger Resolution` section — table
  columns Item, Disposition, Note — with the token grammar
  done(<task-ref>) / closed(<reason>) / deferred(trigger: <condition>).
- `agents/reviewer.md` gains: the reviewer verifies the next plan's Ledger
  Resolution accounts for every row of the last ship report's table.

## Boundaries

### Allowed Changes
- templates/FOLLOW-UP-TABLE.md
- agents/registry.md
- agents/reviewer.md
- skills/plan/SKILL.md
- skills/review/SKILL.md
- tests/prompt-doctrine.test.ts

### Forbidden
- Any other prompt, skill, script or extension
- Naming a skill that is not installed (the existing pin governs)
- Raising docs-lint budgets (baseline must stay byte-identical)

## Completion Criteria

Scenario: the ship report ends with the table
  Test: test_ship_report_ends_with_followup_table
  Given agents/registry.md and skills/review/SKILL.md
  When read
  Then the ship step mandates the follow-up table with Origin, and forbids dangling prose caveats

Scenario: terminal-before-report is doctrine
  Test: test_terminal_before_report_in_registry
  Given agents/registry.md
  When read
  Then the orchestrator must confirm every spawned run terminal with subagent_result results consumed before any completion or ship post

Scenario: plans carry Ledger Resolution
  Test: test_plan_skill_has_ledger_resolution
  Given skills/plan/SKILL.md
  When read
  Then the plan template includes ## Ledger Resolution with the three-token grammar

Scenario: the table template gains Origin and the delete rule
  Test: test_followup_table_origin_column
  Given templates/FOLLOW-UP-TABLE.md
  When read
  Then Origin (planned | new with why) is a pinned column and the delete-not-queue rule is stated

Scenario: the reviewer checks drain-before-grow
  Test: test_reviewer_checks_ledger_resolution
  Given agents/reviewer.md
  When read
  Then the reviewer verifies the next plan resolves every row of the last report's table

Scenario: gates stay green
  Test: test_gates_stay_green
  When bun test and check-drift run
  Then all exit 0
