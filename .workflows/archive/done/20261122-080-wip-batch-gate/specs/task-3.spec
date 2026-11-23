spec: task
name: review-wip-consume
tags: [wip, review, gate]
verify: "bun test tests/review-wip.test.ts"
max-rounds: 2
---

## Intent

Make `the review skill` consume WIP state before SHIP. It must require verdict and
scope proof before the final commit, then mark the batch shipped.

## Decisions

- Stage 3 runs `scripts/wf.sh wip verify`.
- Every task id in `WIP-Batch` needs a final `ok:true` verdict.
- Changed code files must be contained in `WIP-Scope`.
- Failure blocks SHIP and names the missing proof.
- CHANGELOG-first, archive gate, and single-writer rules stay unchanged.

## Boundaries

### Allowed Changes
- .workflows/specs/task-3.spec
- skills/review/SKILL.md
- tests/review-wip.test.ts

### Forbidden
- scripts/**
- extensions/index.ts
- skills/fix/SKILL.md
- skills/refactor/SKILL.md
- .githooks/**
- .workflows/plan.md
- docs/**
- AGENTS.md
- CHANGELOG.md

## Completion Criteria

Scenario: review verifies WIP before SHIP
  Test: test_review_stage3_runs_wip_verify
  Given skills/review/SKILL.md Stage 3
  When the skill text is read
  Then a `wip verify` launcher call appears before the SHIP commit

Scenario: verdict is required
  Test: test_review_requires_final_ok_verdict
  Given a WIP batch with task ids
  When the review gate is evaluated
  Then missing ok:true verdict blocks SHIP and names the task

Scenario: scope is required
  Test: test_review_requires_scope_containment
  Given a changed code file outside WIP-Scope
  When the review gate is evaluated
  Then SHIP is blocked and the file is named

Scenario: successful consumption marks shipped
  Test: test_review_wip_ship_marks_shipped
  Given verdict and scope proof are present
  When the SHIP step proceeds
  Then the skill instructs the gate to call `wip ship`
