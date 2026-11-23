spec: task
name: wip-state-parser
tags: [wip, cli, gate]
verify: "bun test tests/wip.test.ts && node scripts/wip.mjs status --repo ."
max-rounds: 2
---

## Intent

Build the executable WIP state parser and command wiring. The WIP file is
the source of truth for an active unshipped batch; commit trailers are only
optional linkage.

## Decisions

- State path: `.workflows/wip/<batch>.json`.
- Schema: `id`, `kind`, `scope`, `root_cause`, `verdict`, `status`,
  `created_at`.
- Statuses: `awaiting-review`, `ready-to-ship`, `shipped`.
- Commands: `start`, `status`, `ready`, `ship`, `verify`, `message`.
- `scripts/wf.sh` gains `wip` verb; `.mise/tasks/wip` is a thin wrapper.
- `.gitignore` whitelists `.workflows/wip/**`.

## Boundaries

### Allowed Changes
- .workflows/specs/task-1.spec
- scripts/wip.mjs
- tests/wip.test.ts
- scripts/wf.sh
- .mise/tasks/wip
- .gitignore

### Forbidden
- .workflows/plan.md
- other .workflows/** state
- skills/**
- extensions/index.ts
- scripts/check-drift.sh
- .githooks/**
- docs/**
- CHANGELOG.md

## Completion Criteria

Scenario: WIP state starts
  Test: test_wip_start_writes_state_file
  Given a temporary repo with .gitignore
  When wip start runs with id, kind, scope, and root cause
  Then a JSON state file exists under .workflows/wip
  And status is awaiting-review

Scenario: status reports active batch
  Test: test_wip_status_reports_active_batch
  Given one active WIP state file
  When wip status runs
  Then JSON reports active true and the batch id

Scenario: verify blocks missing verdict
  Test: test_wip_verify_blocks_missing_verdict
  Given an active WIP state with verdict null
  When wip verify runs
  Then exit code is 1 and the reason names the missing verdict

Scenario: verify blocks out-of-scope change
  Test: test_wip_verify_blocks_out_of_scope
  Given an active WIP state with scope limited to one path
  When a changed code file lies outside that scope
  Then exit code is 1 and the reason names the file

Scenario: message validates linkage
  Test: test_wip_message_validates_trailers
  Given a commit message fixture with WIP-Batch and WIP-Scope
  When wip message runs
  Then malformed trailers exit 1 and valid trailers exit 0

Scenario: launcher and mise task are wired
  Test: test_wip_launcher_and_mise_task
  Given scripts/wf.sh and .mise/tasks/wip
  When their contents are read
  Then both route to scripts/wip.mjs
