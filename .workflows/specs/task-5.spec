spec: task
name: "whole-plan-review-fixes-083"
tags: [review-fix, format, init]
verify: "mise exec -- dprint check --list-different && bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Close whole-plan review findings from the formatter-gate plan without changing behavior or adding dependencies.

## Decisions

- Pre-commit staged format check applies dprint's include/exclude semantics and validates staged bytes, not working-tree bytes; an empty staged set exits 0.
- Formatter detection recognizes pinned npm dprint plugin specifiers (`npm:@dprint/<name>@<version>`) and tolerates JSONC trailing commas.
- Profile lint rejects write-style formatter commands (`fmt`, `format`, `--write`, `--staged`, `--dirty`) and accepts only read-only checks.
- The worker Verify rule lives in the worker role file, not only in init doctrine.
- All gates end green; no CHANGELOG, package version, dependency, plugin, or behavior surface change.

## Boundaries

### Allowed Changes
- .workflows/specs/task-5.spec
- .githooks/pre-commit
- scripts/init-extract.ts
- scripts/profile-lint.sh
- skills/init/SKILL.md
- agents/worker.md
- tests/init-extract.test.ts
- tests/profile-lint.test.ts
- tests/prompt-doctrine.test.ts
- tests/final-integration.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- CHANGELOG.md
- package.json
- mise.toml
- dprint.json
- docs/**
- README.md
- any path outside Allowed Changes

## Completion Criteria

Scenario: staged hook respects config and staged bytes
  Test: test_hook_excludes_and_staged_bytes
  Given staged JSON files under dprint excludes and a staged source file with an unstaged edit
  When the pre-commit format check runs
  Then excluded staged paths are ignored and an empty eligible set exits 0
  And the eligible file is checked from the index blob, not the worktree copy
  And the hook never runs dprint fmt

Scenario: npm-pinned plugins are detected
  Test: test_npm_pinned_plugin_detection
  Given a dprint config using npm-pinned plugin specifiers
  When formatter profiles are detected
  Then a dprint profile is returned with the exact read-only check command
  And the same config with trailing commas in JSONC still yields the profile

Scenario: profile lint enforces read-only verbs
  Test: test_profile_read_only_verb
  Given a draft formatter profile with a write-style command
  When profile lint runs
  Then it fails with a read-only-verb finding
  And an equivalent read-only check command passes

Scenario: worker role carries the formatting rule
  Test: test_worker_rule_in_role
  Given the worker role file and init doctrine
  When prompt doctrine is read
  Then both state the scoped read-only Verify rule and explicit-path fmt exception
  And no new verification task or role is introduced

Scenario: final gates are green
  Test: test_final_review_fixes_green
  Given the merged fix tree
  When the Verify command runs
  Then dprint check, full suite, docs-lint, and check-drift all exit 0
  And no forbidden path changed
