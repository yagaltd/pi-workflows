spec: task
name: "wave-settle-compaction-wiring"
tags: []
---

## Intent

Wire verdict compaction (backlog item 7) into the orchestration flow: at wave settle, the orchestrator builds ONE question set from the settled children (per task: outcome, blockers, deviations, cost bucket; failed tasks get triage groups), runs `node scripts/judge.mjs ask --questions <set> --audit .workflows/reviews/judge-<plan>.md`, and prints the fixed-size verdict table into leader context instead of re-reading every child narrative. The thin-trigger rule holds: `prompts/next.md` grows by at most one paragraph.

## Decisions

- The compaction step lives in `prompts/next.md` after the wave-completion check: build the question set → run the judge → print the table → handle exceptions exactly as before.
- Hard cap honored: ≤64 questions or the set is split across sequential calls (client enforces per-call; the prompt instructs splitting).
- NO-JUDGE degradation: `JUDGE SKIPPED` ⇒ fall back to the existing per-child summary behavior (stated in one sentence).
- The step adds ONE paragraph maximum — measured, not asserted loosely.

## Boundaries

### Allowed Changes
- prompts/next.md

### Forbidden
- Do not re-introduce task-selection or wave-discipline prose (removed in plan 015 — thin-trigger rule).
- Do not touch `prompts/plan.md` (TASK 2 scope), `scripts/**` (TASK 1), README, CHANGELOG (TASK 4).
- Do not add dependencies.

## Completion Criteria

Scenario: wave settle carries the compaction step
  Test: grep -q "judge.mjs ask" prompts/next.md && grep -qi "wave settle" prompts/next.md
  Given prompts/next.md after the change
  When the wave-settle section is inspected
  Then it instructs building one question set from settled children and running the judge
  And the fixed-size table is printed into leader context

Scenario: question template respects the 64 cap
  Test: grep -q "64" prompts/next.md
  Given prompts/next.md after the change
  When the compaction step is inspected
  Then the 64-question cap and split-on-overflow instruction appear

Scenario: thin trigger rule holds
  Test: test $(wc -l < prompts/next.md) -le 100
  Given prompts/next.md after the change
  When the file length is measured
  Then the total is ≤ 100 lines (was ~90 — one paragraph of net growth)
