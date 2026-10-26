spec: task
name: "run-journal-budget-resume-engine"
tags: [journal, budget, resume, zero-dep]
max-rounds: 2
---

## Intent

`scripts/run-journal.mjs`: append-only run journal (`.workflows/journal.jsonl`),
the budget check the loop reads before each dispatch, and the mechanical
resume report. Budget config: `.workflows/budget.json`
(`{max_tasks?, max_cost_usd?}`) — optional file, absent ⇒ no ceiling.

## Decisions

- Entries: `{ts, planId, taskId?, event, cost?, note?}` with events
  `dispatched | done | failed | blocked | budget-exhausted`.
- Spent: dispatched-event count and summed recorded cost (rounded 4).
- CLI: `record` (append, exit 0) · `check` (exit 0 ok / 1 exhausted, prints
  JSON) · `resume` (prints done / failed / open dispatches, spent, and
  budget headroom; exit 0).
- `main(argv)` injectable + exported for tests.

## Boundaries

### Allowed Changes
- scripts/run-journal.mjs
- tests/run-journal.test.ts

### Forbidden
- prompts/, extensions/index.ts, README.md, CHANGELOG.md, package.json
- scripts/dispatch-ledger.mjs (read-only interplay later)

## Completion Criteria

Scenario: journal appends and resumes a run from recorded task states
  Test: journal appends and resumes a run from recorded task states
  Then resume reports done, failed and open dispatches from the journal alone

Scenario: budget exhaustion stops the run with a loud budget record
  Test: budget exhaustion stops the run with a loud budget record
  Then check exits 1 at max_tasks with the reason, and budget-exhausted entries are recorded data

Scenario: cost budget sums recorded spend and blocks over the cap
  Test: cost budget sums recorded spend and blocks over the cap
  Then max_cost_usd blocks when summed recorded cost exceeds the cap
