spec: task
name: "dispatcher-resolve-next-cache-affinity"
tags: []
---

## Intent

Move `/next` and `/auto-next` task selection, pack assembly, and dispatch ordering from model reasoning to deterministic code: the pi-workflows extension gains `resolveNext()` — a pure function over `.workflows/plan.md` that returns the next eligible task, its assembled context pack, and the gate command list — plus cache-affinity ordering (same-model/same-role adjacency, prefix-stable pack layout, per-task divergence last, ramped same-model launches). The prompts shrink to thin triggers: dispatch per shape, handle exceptions only.

## Decisions

- Selection rules (in order): status pending ∧ dependencies satisfied ∧ earliest Wave; ties broken by tier (A < B < C) then task id. Stale status (✅ with no ok:true verdict on file) ⇒ blocked result naming the gap. Referenced spec missing ⇒ blocked result, never specless dispatch.
- `resolveNext()` output: `{ ok: true, task, pack, gateCommands }` or `{ ok: false, blocked, reason }`. Pure — no I/O beyond reading plan.md/registry/spec paths passed in.
- Pack assembly: shared prefix block first (GUARD line, plan provenance, env law, dead ends), per-task divergence last (TASK line, goal, Allowed paths, Verify line).
- Cache-affinity: within a wave, dispatch order sorts by (model, thinking, role); same-model launches ramp sequentially. Ordering is asserted in tests, not tuned by prompts.
- `prompts/next.md` + `prompts/auto-next.md` become thin triggers: read plan.md, call the dispatcher, dispatch per `agents/dispatch-shapes.md`, handle exceptions. All selection prose removed.
- No runtime swap: pi-core-subagent stays the execution mechanism.

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/extension.test.ts
- prompts/next.md
- prompts/auto-next.md

### Forbidden
- Do not touch `agents/**`, `skills/**`, `scripts/dispatch-ledger.mjs` (TASK 2 scope), `templates/**`, README, CHANGELOG (TASK 4 scope).
- Do not modify pi-core-subagent or swap the runtime.
- Do not add dependencies.

## Completion Criteria

Scenario: resolves the earliest eligible task
  Test: resolves the earliest eligible task
  Given a fixture plan with three pending tasks across two waves and satisfied dependencies only for the Wave 1 task
  When resolveNext runs
  Then it returns the Wave 1 task
  And the result includes an assembled pack whose first lines are the shared GUARD and provenance block

Scenario: skips tasks with unsatisfied dependencies
  Test: skips tasks with unsatisfied dependencies
  Given a fixture plan where the only pending Wave 1 task depends on an unfinished task
  When resolveNext runs
  Then the result is blocked with reason naming the unfinished dependency

Scenario: orders a wave by model then thinking then role
  Test: orders a wave by model then thinking then role
  Given a wave of four tasks with mixed model, thinking, and role assignments
  When the cache-affinity ordering runs
  Then tasks sharing model and role are adjacent
  And no two consecutive tasks differ in model when a same-model ordering exists

Scenario: blocks on stale task status
  Test: blocks on stale task status
  Given a fixture plan where a task is marked done but no ok:true verdict file exists
  When resolveNext runs
  Then the result is blocked with reason naming the missing verdict

Scenario: next prompt defers selection to the dispatcher
  Test: next prompt is a thin trigger
  Given prompts/next.md and prompts/auto-next.md after the change
  When their content is inspected
  Then neither contains wave-selection or dependency-resolution prose
  And both instruct reading the dispatcher result before any dispatch
