spec: task
name: "judge-plan-doctrine-docs"
tags: [judge, doctrine, docs]
verify: "bun test tests/prompt-doctrine.test.ts && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Update the plan doctrine so pre-flight questions are content-bound, use the accepted yes/no schema, and name the new lint gate in canon. Keep change history out of worker tasks.

## Decisions

- The pre-flight command includes supplied context; a bare path reference is invalid.
- The template uses five yes/no questions; `yes` means the named finding is present; confidence is numeric.
- Diff-bound evidence remains a Stage 2 `bench verdicts` route; pre-flight is always content-bound.
- Step 3 routes fixes by finding ID plus manual inspection of the content-bound spec; yes/no questions do not ask for quoted or named details they cannot return.
- The canon rule states that paths are pointers, not evidence, and names the context lint gate on the same line.
- Docs baseline is regenerated only through the docs-lint gate; CHANGELOG and package version stay SHIP-only.

## Boundaries

### Allowed Changes
- .workflows/specs/task-3.spec
- skills/plan/SKILL.md
- docs/canon.md
- scripts/docs-lint-baseline.json
- tests/prompt-doctrine.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- scripts/judge.mjs
- scripts/check-judge-context.mjs
- scripts/wf.sh
- scripts/init-extract.ts
- CHANGELOG.md
- package.json
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: plan template is content-bound
  Test: test_plan_template_content_bound
  Given the Phase 5 pre-flight section
  When the doctrine is read
  Then the command supplies context with the question file
  And no bare contract-path template remains
  And five yes/no finding questions replace the unsupported object schemas
  And no question asks the judge to quote or name free-text details
  And fix routing names each finding ID and directs manual inspection of the bound spec

Scenario: diff-bound route stays in Stage 2
  Test: test_preflight_content_bound_only
  Given the plan pre-flight text
  When the evidence rules are read
  Then pre-flight is content-bound only
  And diff-bound evidence is named as a Stage 2 route

Scenario: canon rule names its gate
  Test: test_canon_paths_not_evidence
  Given the canon surface
  When the paths-not-evidence rule is read
  Then it names the context lint gate on the same line
  And docs-lint and check-drift are clean after baseline regeneration
