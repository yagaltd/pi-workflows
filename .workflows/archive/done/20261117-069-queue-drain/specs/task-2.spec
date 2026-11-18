spec: task
name: verify-rust-binding-shared-discovery
tags: [tdd-guard, verify, discovery]
verify: "bunx vitest run && bunx tsc --noEmit && bunx tsc"
max-rounds: 2
---

## Intent

verify binds selectors through the project's own test runner, discovery is one
shared implementation, and the hygiene debt (README, vitest exclude) is paid
in the same pass.

## Decisions

- Rust binding: when the target repo is a cargo project, verify resolves
  selectors via `cargo test --quiet -- --list` (runner listing, not JS
  parsing); per-selector verdicts report found/not-found as today, loud exit
  semantics unchanged. JS resolution unchanged.
- Shared discovery: extract lint's discovery (segment-precise exclusion,
  tests/ → test/ → src-colocated probing, allowEmpty) into one module; verify
  and mutate use it; the hardcoded `--tests tests` defaults go; explicit
  flags win everywhere; zero-files fails loudly everywhere.
- Hygiene: README documents --allow-empty, the discovery probe order, and
  zero-files behavior; vitest config excludes .git/** (root runs stop
  sweeping subagent fixtures).
- Version 0.1.3 + CHANGELOG.
- Pre-authorized by boundary generosity: README and vitest config are in
  Allowed so the hygiene batch lands with the code, not after it.

## Boundaries

### Allowed Changes
- src/lint.ts
- src/verify.ts
- src/mutate.ts
- src/discovery.ts
- src/cli.ts
- src/config.ts
- src/types.ts
- tests/**
- ./README.md
- vitest.config.ts
- ./package.json
- ./CHANGELOG.md
- dist/**

### Forbidden
- The six lint rules' semantics
- Rust fixture crates under tests/fixtures that take >10s to compile (keep
  the E2E crate tiny)

## Completion Criteria

Scenario: rust selectors resolve via the runner listing
  Test: rust_selectors_resolve_via_cargo_listing
  Given a tiny cargo fixture with a named test
  When verify runs against it
  Then the selector reports found via the cargo listing, not JS parsing

Scenario: inline cfg-test modules are found
  Test: inline_cfg_test_modules_found
  Given the fixture also declares a `#[cfg(test)]` inline module
  When the listing is consulted
  Then its tests are in the selector set

Scenario: discovery is shared
  Test: discovery_shared_by_all_three_commands
  Given lint, verify and mutate
  When their sources are inspected by the pin test
  Then all three use the one discovery module and no hardcoded tests default remains

Scenario: explicit flags win everywhere
  Test: explicit_tests_flag_wins_everywhere
  Given an explicit --tests on any command
  When discovery runs
  Then the explicit root is used, probing skipped

Scenario: readme documents the behavior
  Test: readme_documents_allow_empty_and_discovery
  Given README.md
  When the pin test reads it
  Then --allow-empty, probe order, and zero-files behavior are documented

Scenario: vitest stops sweeping worktrees
  Test: vitest_excludes_git_subagents
  Given vitest.config.ts
  When the pin test reads it
  Then .git/** is excluded
