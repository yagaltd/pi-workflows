spec: task
name: "flow-runner-control-plane-on-resolveNext"
tags: [flows, runner, dispatcher, control-plane]
max-rounds: 2
---

## Intent

`scripts/flow-run.mjs <flow.json>`: validate, compute waves, dispatch-decide
each task step through the real `resolveNext` (via the shipped bun probe),
write per-task dispatch packs and a run report, execute gate steps at wave
boundaries. v1 is the control plane — workers stay with `/next`.

## Decisions

- Compile: task steps render into the house plan-text format (statuses,
  waves, deps, tiers, tdd, allowed, verify) plus a registry map; dispatch
  decisions spawn `bun scripts/eval-dispatch-probe.ts` with synthesized
  verdicts for already-packed tasks.
- Wave boundary: the probe reporting `no-tasks` ends the wave; any other
  blocked code fails the run.
- Packs land in `.workflows/flows/runs/<slug>/pack-<id>.txt`; the report
  (`report.json`) records steps, gates, transform `set` fields, statuses.
- `--dry-run` skips gate command execution and prints them.
- Exit: 0 clean · 1 validation, gate failure, or unexpected blocked code.

## Boundaries

### Allowed Changes
- scripts/flow-run.mjs
- tests/flows-run.test.ts
- tests/fixtures/flows/

### Forbidden
- scripts/flow-schema.mjs, scripts/flow-gates.mjs (import only)
- extensions/index.ts, .workflows/evals/

## Completion Criteria

Scenario: flow-run compiles a flow onto resolveNext wave order
  Test: flow-run compiles a flow onto resolveNext wave order
  Then a two-wave flow packs wave-1 tasks in tier-then-id order and stops at the boundary

Scenario: flow-run emits dispatch packs and a run report
  Test: flow-run emits dispatch packs and a run report
  Then pack files and report.json exist with statuses recorded

Scenario: invalid flows never dispatch
  Test: invalid flows never dispatch
  Then a cyclic flow exits 1 with the cycle blocked code and writes no packs
