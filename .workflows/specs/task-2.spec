spec: task
name: "judge-context-lint-wiring"
tags: [judge, lint, launcher]
verify: "bun test tests/judge-context.test.ts tests/wf-launcher.test.ts tests/init-extract.test.ts"
max-rounds: 2
---

## Intent

Add a mechanical lint that rejects path-only pre-flight questions, expose it through the shared launcher, and generate the consumer mise wrapper without copying package scripts.

## Decisions

- The lint takes a question file plus one or more supplied context paths.
- Every spec path referenced by a question must be supplied as context; otherwise the lint exits 1 with the exact finding.
- The lint is parse-only: it never sends a judge request and never executes selectors.
- The launcher verb is `judge-context`; the generated task is `wf:judge-context`.
- Package scripts stay package-owned; `/init` only writes namespaced wrappers through the existing fragment builder.

## Boundaries

### Allowed Changes
- .workflows/specs/task-2.spec
- scripts/check-judge-context.mjs
- scripts/wf.sh
- scripts/init-extract.ts
- tests/judge-context.test.ts
- tests/wf-launcher.test.ts
- tests/init-extract.test.ts
- tests/mise-tasks.test.ts
- tests/prompt-doctrine.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- scripts/judge.mjs
- skills/**
- docs/**
- CHANGELOG.md
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: path-only question is rejected
  Test: test_path_only_question_rejected
  Given a question file that references a contract path without supplying context
  When the lint runs
  Then it exits 1 with `path-only judge question; embed the contract or supply it with --context`
  And no judge request is made

Scenario: context-bound question passes
  Test: test_context_supplied_question_passes
  Given a question file that references a contract path and that path is supplied as context
  When the lint runs
  Then it exits 0 with no finding

Scenario: launcher exposes the lint
  Test: test_judge_context_wf_verb
  Given the shared launcher
  When `judge-context` is invoked
  Then it forwards all arguments to the new lint script
  And the launcher usage lists the verb

Scenario: init generates the mise wrapper
  Test: test_init_mise_wrapper
  Given the deterministic fragment builder
  When the fragment is generated
  Then it contains `wf:judge-context`
  And no executable script is copied into a consumer repo
