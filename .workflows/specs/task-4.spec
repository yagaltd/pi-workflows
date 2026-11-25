spec: task
name: "final-review-integration-fixes-081"
tags: [review-fix, rust, integration]
verify: "mise exec -- bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Close the four integration findings from the whole-plan review. Do not add new behavior; make the already-planned Rust gate and skill wiring work on real live paths and fresh Cargo workspaces.

## Decisions

- The live judge schema's `reviewSkills` description must name the same four-skill Rust family as the recorded backend and charter.
- The generated Rust check must not pass `--allow` with a nonexistent allow file; existing debt allowlists are owner-managed and tree-declared.
- The generated Rust check must bootstrap `Cargo.lock` with a non-locked metadata command before any `--locked` command.
- The universal AGENTS template must contain no Rust-specific pointer; conditional Rust doctrine lives in the init skill, reviewer rules, and policy.
- No test may be weakened; stubs must not mask nonexistent files or missing lockfiles.

## Boundaries

### Allowed Changes
- .workflows/specs/task-4.spec
- extensions/index.ts
- scripts/init-extract.ts
- skills/init/SKILL.md
- templates/AGENTS.md
- README.md
- README*
- docs/architecture.md
- scripts/docs-lint-baseline.json
- tests/prompt-doctrine.test.ts
- tests/init-extract.test.ts
- tests/flow-gates-mise.test.ts
- tests/mise-tasks.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- CHANGELOG.md
- scripts/flow-gates.mjs
- generated allow files
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: live judge schema names four Rust skills
  Test: test_live_schema_review_skills
  Given the live judge extraction schema for stackDetection.reviewSkills
  When the schema description is read
  Then it names rust-review, rust-best-practices, rust-port, rust-crate-architecture
  And the recorded backend remains consistent

Scenario: generated check has no missing allow dependency
  Test: test_deslop_no_missing_allow
  Given the generated Rust check string and a real deslop-please CLI
  When the check is inspected or executed without an allow file
  Then no --allow flag points at a nonexistent file
  And a missing owner-managed allow file is not required for a fresh workspace

Scenario: Cargo lock is bootstrapped before locked commands
  Test: test_cargo_lock_bootstrap
  Given a fresh Cargo workspace with no lockfile
  When the generated Rust check runs
  Then a non-locked cargo metadata command runs first
  And --locked commands only follow after the lockfile exists

Scenario: universal template has no Rust pointer
  Test: test_non_rust_template_no_pointer
  Given the universal AGENTS template and a non-Rust adopt charter
  When the charter is generated
  Then the template contains no Rust-specific structural-gate pointer
  And the non-Rust charter remains byte-identical to the pre-plan output
  And the Rust gate still appears in Rust charters and doctrine files

Scenario: full integrated suite is green
  Test: test_final_review_integration_gates
  Given the merged tree after this fix
  When the Verify command runs
  Then bun test reports zero failures
  And docs-lint and check-drift exit zero with no budget rise
