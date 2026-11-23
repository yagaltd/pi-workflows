spec: task
name: fix-wip-emit
tags: [wip, fix, doctrine]
verify: "bun test tests/fix-wip.test.ts"
max-rounds: 2
---

## Intent

Make `the fix skill` emit WIP state at its Phase 9 STOP. The fixer still never
commits; it hands the human a batch identity and scope.

## Decisions

- Phase 9 keeps the STOP and human approval rule verbatim.
- Add one launcher call: `scripts/wf.sh wip start`.
- Scope comes from the fix's Allowed Changes.
- Status starts as `awaiting-review`.
- The approved commit may carry `WIP-Batch` linkage only.

## Boundaries

### Allowed Changes
- .workflows/specs/task-2.spec
- skills/fix/SKILL.md
- tests/fix-wip.test.ts

### Forbidden
- scripts/**
- extensions/index.ts
- skills/review/SKILL.md
- skills/refactor/SKILL.md
- .githooks/**
- .workflows/plan.md
- docs/**
- AGENTS.md
- CHANGELOG.md

## Completion Criteria

Scenario: fix emits WIP state at STOP
  Test: test_fix_phase9_emits_wip_start
  Given skills/fix/SKILL.md Phase 9
  When the skill text is read
  Then it contains a `wip start` launcher call
  And the call sets scope from Allowed Changes

Scenario: STOP remains binding
  Test: test_fix_stop_verbatim
  Given the updated Phase 9
  When the skill text is read
  Then the human STOP approval instruction remains verbatim

Scenario: no agent commit instruction
  Test: test_fix_has_no_agent_commit_instruction
  Given the updated fix skill
  When commit-related prose is read
  Then it never tells the fixer to commit without approval

Scenario: WIP linkage is optional
  Test: test_fix_wip_linkage_only
  Given the emitted handoff
  When the commit message guidance is read
  Then WIP trailers are described as linkage, not state
