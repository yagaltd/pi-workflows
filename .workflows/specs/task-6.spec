spec: task
name: wip-dispatch-block
tags: [wip, dispatcher, gate]
verify: "bun test tests/wip-dispatch.test.ts tests/extension.test.ts"
max-rounds: 2
---

## Intent

Block new batch dispatch while a WIP batch is active. `dispatchNext` stays
read-only and returns a structured reason.

## Decisions

- Consult `scripts/wip.mjs status` through a pure helper.
- Return `ok:false, blocked:"wip-active"` before task selection.
- Reason names the batch and the `/review` remedy.
- Keep `readOnlyHint: true`.
- No new `before_agent_start` handler.

## Boundaries

### Allowed Changes
- .workflows/specs/task-6.spec
- extensions/index.ts
- tests/wip-dispatch.test.ts

### Forbidden
- scripts/**
- skills/**
- .githooks/**
- .mise/**
- .workflows/plan.md
- docs/**
- AGENTS.md
- CHANGELOG.md

## Completion Criteria

Scenario: active WIP blocks dispatch
  Test: test_dispatch_blocks_when_wip_active
  Given a fixture repo with an active WIP batch
  When dispatchNext runs
  Then result ok is false and blocked is wip-active

Scenario: clean repo dispatches normally
  Test: test_dispatch_clean_repo_unblocked
  Given no active WIP batch and a live plan
  When dispatchNext runs
  Then it selects the next eligible task

Scenario: dispatcher stays read-only
  Test: test_dispatch_wip_block_is_read_only
  Given the dispatchNext tool annotation
  When tool metadata is read
  Then readOnlyHint remains true and no file is written
