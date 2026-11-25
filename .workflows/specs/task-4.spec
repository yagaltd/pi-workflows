spec: task
name: "judge-content-binding-review-fixes"
tags: [review-fix, judge, integration]
verify: "mise exec -- bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Close the whole-plan review findings so content-bound pre-flight works from installed-package consumers, the context lint is not vacuous, the confidence floor stays numeric, and init docs match generated wrappers.

## Decisions

- Context paths resolve against the consumer working directory, not the installed package root.
- The context lint requires supplied context for any pre-flight question set, even when questions are path-free.
- The numeric 0.6 confidence floor remains the escalation threshold; vague “near 0.5” language is invalid.
- The init wrapper inventory includes the generated judge-context task.
- Docs baseline is regenerated only through the docs-lint gate.

## Boundaries

### Allowed Changes
- .workflows/specs/task-4.spec
- scripts/judge.mjs
- scripts/check-judge-context.mjs
- skills/plan/SKILL.md
- skills/init/SKILL.md
- scripts/docs-lint-baseline.json
- tests/judge.test.ts
- tests/judge-context.test.ts
- tests/prompt-doctrine.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- CHANGELOG.md
- package.json
- scripts/wf.sh
- scripts/init-extract.ts
- docs/**
- README.md
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: context resolves from consumer cwd
  Test: test_context_resolves_from_consumer_cwd
  Given an installed-package launcher invoked from a consumer repository
  When a spec path is supplied as context
  Then the path is validated under the consumer working directory
  And the contract text is bound without a package-root skip

Scenario: lint rejects context-free pre-flight sets
  Test: test_lint_requires_context_for_preflight
  Given a path-free question set using the five pre-flight finding ids
  When the context lint runs without supplied context
  Then it exits 1 with the path-only finding
  And the same set with supplied context exits 0

Scenario: confidence floor stays numeric
  Test: test_confidence_floor_preserved
  Given the plan pre-flight doctrine
  When the escalation rule is read
  Then it names 0.6 as the numeric floor
  And no vague near-0.5 wording remains

Scenario: init wrapper inventory is current
  Test: test_init_wrapper_inventory_current
  Given the init skill's generated wrapper list
  When the list is read
  Then it includes wf:judge-context alongside the existing wrappers

Scenario: integrated gates are green
  Test: test_stage2_fixes_green
  Given the merged tree after this fix
  When the Verify command runs
  Then the pinned full suite has zero failures
  And docs-lint and check-drift exit zero with no budget rise
