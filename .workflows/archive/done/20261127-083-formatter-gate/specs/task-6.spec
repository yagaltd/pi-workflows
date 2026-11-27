spec: task
name: "ship-sweep-pin-repair"
tags: [ship, pins, tests]
verify: "mise exec -- dprint check --list-different && bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 4
---

## Intent

Repair stale test pins after the orchestrator SHIP sweep wrote the release entry, bumped the package version, and refreshed docs. Preserve every behavior and history guard.

## Decisions

- Release pin points to the current top CHANGELOG entry and package version.
- SHIP-owned history/docs changes are recognized as orchestrator-owned, not worker-boundary drift, while live forbidden edits still fail.
- No docs, config, source, CHANGELOG, package, or dprint edits are made in this task; only test assertions/pins may change.
- Full pinned suite, dprint check, docs-lint, and check-drift end green.

## Boundaries

### Allowed Changes
- .workflows/specs/task-6.spec
- tests/chooser-wiring.test.ts
- tests/final-integration.test.ts
- tests/mise-tasks.test.ts
- tests/prompt-doctrine.test.ts
- tests/flow-gates-mise.test.ts
- tests/format-chooser.test.ts
- tests/archive-drift.test.ts
- tests/extension.test.ts
- tests/wip.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- CHANGELOG.md
- package.json
- README.md
- docs/**
- scripts/**
- mise.toml
- dprint.json
- any path outside Allowed Changes

## Completion Criteria

Scenario: release pin is current
  Test: test_release_pin_current
  Given the current top release entry and package version
  When release wiring tests run
  Then they assert the current plan id and version
  And do not rewrite release history

Scenario: SHIP-owned docs/history are recognized
  Test: test_ship_owned_changes_allowed
  Given the sweeps docs and CHANGELOG changes
  When boundary and integration tests run
  Then those paths are classified as SHIP-owned
  And live forbidden edits still fail

Scenario: formatter pins remain green
  Test: test_formatter_pins_remain_green
  Given the landed formatter gate
  When release and docs tests run
  Then all dprint, format-check, and docs-budget assertions still pass
  And no formatter assertion is weakened

Scenario: final gates are green
  Test: test_ship_pin_gates_green
  Given the repaired test pins
  When the Verify command runs
  Then dprint check, full suite, docs-lint, and check-drift all exit 0
