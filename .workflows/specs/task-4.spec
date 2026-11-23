spec: task
name: refactor-wip-commits
tags: [wip, refactor, doctrine]
verify: "bun test teststhe refactor skill-wip.test.ts"
max-rounds: 2
---

## Intent

Remove the `the refactor skill` commit contradiction. Per-step rollback points become
WIP state plus a human-approved commit; the final commit remains `the review skill`'s.

## Decisions

- Keep the rollback-point advice in substance.
- Emit WIP state through `scripts/wf.sh wip start`.
- Keep Phase 4 STOP and keep/rollback decision human.
- No agent-commit instruction outside human approval.

## Boundaries

### Allowed Changes
- .workflows/specs/task-4.spec
- skillsthe refactor skill/SKILL.md
- teststhe refactor skill-wip.test.ts

### Forbidden
- scripts/**
- extensions/index.ts
- skills/fix/SKILL.md
- skillsthe review skill/SKILL.md
- .githooks/**
- .workflows/plan.md
- docs/**
- AGENTS.md
- CHANGELOG.md

## Completion Criteria

Scenario: refactor step uses WIP state
  Test: test_refactor_step_emits_wip_state
  Given the per-step commit advice in skillsthe refactor skill/SKILL.md
  When the skill text is read
  Then it contains a `wip start` launcher call

Scenario: STOP remains binding
  Test: test_refactor_stop_verbatim
  Given the updated refactor skill
  When the skill text is read
  Then the human STOP and keep-or-rollback decision remain

Scenario: final commit stays with review
  Test: test_refactor_final_commit_with_review
  Given the updated refactor skill
  When commit ownership is read
  Then final SHIP commit is attributed to `the review skill`
