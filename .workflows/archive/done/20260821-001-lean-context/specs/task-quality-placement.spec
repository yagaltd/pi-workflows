spec: task
name: "Quality-reviewer placement codified"
tags: [quality-reviewer, doctrine, placement]
---

## Intent

Codify where the quality-reviewer runs: per-task only for 🔴/🟡/🟠 tags (after mechanical ok:true), never per-wave (waves are independent parallel tasks), with /review as the whole-plan quality gate.

## Decisions

- Per-wave quality review is rejected: waves are disjoint independent tasks, quality-judging them together is the wrong granularity
- Tag-gated per-task: 🔴/🟡/🟠 only; ⚪ tasks rely on mechanical verdict + /review
- /review unchanged as the whole-plan quality gate

## Boundaries

### Allowed Changes
- agents/execution-doctrine.md
- agents/registry.md
- prompts/next.md
- prompts/auto-next.md

### Forbidden
- agents/dispatch-shapes.md, extensions/, tests/, skills/

## Completion Criteria

Scenario: Doctrine states the placement rule
  Test: grep -c "per-task" agents/execution-doctrine.md
  Given the doctrine updated
  Then it states quality-reviewer runs per-task gated by 🔴/🟡/🟠 after mechanical ok:true, and explicitly never per-wave

Scenario: /next reflects the gate
  Test: grep -c "quality-reviewer" prompts/next.md
  Given next.md step 4 updated
  Then the quality-reviewer loop is described as tag-gated per-task

Scenario: Repo checks stay green
  Test: ./scripts/check-drift.sh
  Given all edits applied
  Then drift checker and unit tests exit 0

Verify: grep -q "never per-wave" agents/execution-doctrine.md && bun test tests/ && ./scripts/check-drift.sh
