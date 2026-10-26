spec: task
name: "budget-journal-wiring-docs-release"
tags: [journal, budget, wiring, docs]
max-rounds: 2
---

## Intent

Wire the protocol into `/auto-next` + `/next`: record dispatched/done/failed
(with cost) per task, run `check` before each dispatcher re-run, BUDGET STOP
on exhaustion, resume from the journal. Document the budget file and resume
command. Release v0.9.2.

## Decisions

- `/auto-next` gains a Budget + journal protocol block: record before and
  after; `check` exit 1 ⇒ record `budget-exhausted`, print done-vs-remaining
  + resume command, stop.
- `/next` records its single dispatch + verdict (lighter protocol).
- README section names the check and resume commands (claim-to-gate rule).

## Boundaries

### Allowed Changes
- prompts/auto-next.md
- prompts/next.md
- README.md
- CHANGELOG.md
- package.json
- tests/budget-wiring.test.ts

### Forbidden
- scripts/run-journal.mjs (task-1 owns it)
- extensions/index.ts, agents/, templates/

## Completion Criteria

Scenario: auto-next and next prompts carry the budget and journal protocol
  Test: auto-next and next prompts carry the budget and journal protocol
  Then both prompts reference run-journal record + check, and auto-next defines BUDGET STOP

Scenario: readme documents the budget file and resume command
  Test: readme documents the budget file and resume command
  Then README names .workflows/budget.json and the resume command
