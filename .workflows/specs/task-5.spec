spec: task
name: wip-gate-wiring
tags: [wip, gate, drift]
verify: "bun test tests/wip-gate.test.ts && bash scripts/check-drift.sh --only wip"
max-rounds: 2
---

## Intent

Add one fail-tier WIP section to `check-drift.sh` and wire pre-commit
message validation into it. `mise run ci` inherits the section through the
existing drift step.

## Decisions

- Section number is 13; selection flag is `--only wip`.
- Missing verdict directory or fresh clone is a loud skip.
- Malformed state, out-of-scope staged files, or unconsumed SHIP batch fails.
- Pre-commit validates `$1` with `wip message` before `exec check-drift`.
- `scripts/check-tree.mjs` stays WARN and is not used as the WIP gate.

## Boundaries

### Allowed Changes
- .workflows/specs/task-5.spec
- .githooks/pre-commit
- scripts/check-drift.sh
- tests/wip-gate.test.ts

### Forbidden
- justfile
- scripts/wip.mjs
- scripts/docs-lint.sh
- skills/**
- extensions/index.ts
- .workflows/plan.md
- docs/**
- AGENTS.md
- CHANGELOG.md

## Completion Criteria

Scenario: WIP section detects malformed state
  Test: test_check_drift_wip_fails_malformed_state
  Given a fixture tree with malformed WIP state
  When check-drift runs with --only wip
  Then exit code is 1 and the finding names the file

Scenario: WIP section skips loudly
  Test: test_check_drift_wip_loud_skip
  Given a fresh clone with no verdict directory
  When check-drift runs with --only wip
  Then it prints a loud skip and does not fail

Scenario: pre-commit validates linkage
  Test: test_precommit_validates_wip_message
  Given .githooks/pre-commit
  When its text is read
  Then it calls `wip message` before executing check-drift

Scenario: CI inherits the gate
  Test: test_mise_ci_inherits_wip_gate
  Given .mise/tasks/ci and check-drift
  When their contents are read
  Then CI runs check-drift without a duplicate WIP check
