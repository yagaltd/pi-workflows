spec: task
name: intake-doctrine
tags: [doctrine, ledger, process]
verify: "bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh"
max-rounds: 2
---

## Intent

Findings route by scope, not by luck: in-scope findings are fixed in the loop,
out-of-scope findings pass a triage gate before entering the durable queue,
specs pre-authorize the adjacent work a worker will inevitably see, and extra
rounds are granted for progress, never granted blindly.

## Decisions

- `templates/FOLLOW-UP-TABLE.md` gains the intake triage rule: a row reaches
  the durable queue only via one of queued (Risk P0-P2) / batched (P3 items
  bundle into one row per repo-theme, members named) / closed (deleted, one
  line stating why, kept in the fix-round trail) / done. P3/S never queues
  individually.
- `agents/worker.md` gains in-scope-must-fix: a defect found inside your own
  Allowed Changes is fixed in the loop (TDD when code); the follow-up table is
  for what your boundaries forbid, nothing else.
- `agents/reviewer.md` gains two rules: (a) queueing an in-scope item is a
  finding (the worker had the license); (b) progress-gated extension: the
  reviewer may grant exactly ONE extra round when findings demonstrably shrink
  (fewer or lower-severity than the prior round); round exhaustion routes
  loudly to orchestrator adjudication (spec amendment / boundary extension /
  closure), never silently into the ledger.
- `skills/plan/SKILL.md` gains two authoring rules: (a) boundary generosity —
  pre-authorize in Allowed the adjacent fixes the worker will inevitably see;
  (b) content-fact scenarios cite grep-able pins in existing test files so
  verify binds (doc-only specs with unbindable selectors are an authoring
  defect).
- In-scope cosmetics fixed in passing (this is the rule applied to this plan):
  `skills/review/SKILL.md` stage-3 stray duplicate "5." renumbered;
  `templates/FOLLOW-UP-TABLE.md` worked-example cells backticked (bare P/S
  cells and unbackticked plan ids keep harper debt on those lines).

## Boundaries

### Allowed Changes
- templates/FOLLOW-UP-TABLE.md
- agents/worker.md
- agents/reviewer.md
- skills/plan/SKILL.md
- skills/review/SKILL.md
- tests/prompt-doctrine.test.ts

### Forbidden
- Any script, extension, or other prompt
- Raising docs-lint budgets (baseline byte-identical)
- Changing max-rounds defaults anywhere (the default stays 2; extension is
  reviewer-granted per the doctrine above)

## Completion Criteria

Scenario: the triage gate is doctrine
  Test: test_intake_triage_rule_in_template
  Given templates/FOLLOW-UP-TABLE.md
  When read
  Then the four-way disposition (queued P0-P2 / batched members-named / closed-with-why / done) is stated and P3/S never queues individually

Scenario: in-scope findings are fixed, not queued
  Test: test_in_scope_findings_fixed_in_loop
  Given agents/worker.md
  When read
  Then a defect inside your own Allowed Changes is fixed in the loop and the follow-up table is only for what boundaries forbid

Scenario: queueing in-scope is a finding
  Test: test_queueing_in_scope_is_a_finding
  Given agents/reviewer.md
  When read
  Then a worker row queuing an item inside that task's Allowed is itself a reviewer finding

Scenario: rounds extend on progress only
  Test: test_progress_gated_extension
  Given agents/reviewer.md
  When read
  Then exactly one extension round may be granted on shrinking findings, and round exhaustion routes loudly to orchestrator adjudication

Scenario: specs pre-authorize adjacent work
  Test: test_boundary_generosity_guidance
  Given skills/plan/SKILL.md
  When read
  Then the contract guidance says to pre-authorize in Allowed the adjacent fixes the worker will inevitably see

Scenario: content-fact scenarios bind
  Test: test_doc_scenario_grep_pins
  Given skills/plan/SKILL.md
  When read
  Then doc-only scenarios must cite grep-able pins in existing test files

Scenario: the in-scope cosmetics are fixed
  Test: test_in_scope_cosmetics_fixed
  Given skills/review/SKILL.md and templates/FOLLOW-UP-TABLE.md
  When scanned
  Then the stage-3 list has no duplicate numbering and the worked-example cells carry backticks
