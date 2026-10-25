spec: task
name: "Unified worker→reviewer graph in sequential /next"
tags: [next, dispatch, verdict-gating]
---

## Intent

Sequential /next dispatches ONE subagent call containing worker + reviewer linked by a `needs` edge, so the reviewer fires mechanically when the worker settles — no orchestrator turn in between, verdict gating becomes engine-enforced rather than model-remembered.

## Decisions

- Engine = unconditional sequencing (`needs` edges); orchestrator = conditionality (fix rounds stay follow-up dispatches — no conditional nodes wanted)
- Failed worker auto-aborts the reviewer node: correct (don't review broken work); the abort is the orchestrator's failure signal
- `background: false` retained — the call returns when the whole graph settles

## Boundaries

### Allowed Changes
- prompts/next.md
- agents/execution-doctrine.md
- agents/dispatch-shapes.md

### Forbidden
- prompts/auto-next.md (TASK_2/3 territory)
- agents/registry.md
- extensions/, tests/, scripts/

## Completion Criteria

Scenario: Sequential dispatch is one graph call
  Test: grep -q "needs" prompts/next.md
  Given /next executing a sequential worker task
  When dispatching
  Then the shape shows tasks: [worker, reviewer with needs: [worker]] in ONE subagent call and the text states the reviewer fires with no orchestrator turn between

Scenario: Abort semantics documented
  Test: grep -c "abort" agents/execution-doctrine.md
  Given a failed or blocked worker in the graph
  Then execution-doctrine.md documents that the reviewer node auto-aborts and the orchestrator reads the abort as the failure signal (minimum 1 relevant mention)

Scenario: Fix rounds stay follow-ups
  Test: grep -c "follow-up dispatch" agents/execution-doctrine.md
  Given a reviewer verdict ok:false
  Then fix rounds remain conditional follow-up dispatches per the doctrine (unchanged from before this task)

Scenario: Repo checks stay green
  Test: ./scripts/check-drift.sh
  Given all edits applied
  When running the drift checker and unit tests
  Then both exit 0

Verify: grep -q "needs" prompts/next.md && bun test tests/ && ./scripts/check-drift.sh
