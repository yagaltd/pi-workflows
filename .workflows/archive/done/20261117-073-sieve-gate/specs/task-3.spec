spec: task
name: tdd-guard-rust-classification
tags: [tdd-guard, rust, lint]
verify: "bunx vitest run && bunx tsc --noEmit && bunx tsc"
max-rounds: 2
---

## Intent

lint stops loud-failing on Rust repositories: when every discovered test file
is Rust (or Cargo.toml is present and zero JS-parseable blocks exist), lint
classifies SKIPPED-RUST with a loud message and exits 0. The 067 zero-files
loud guard stays exactly as-is for JS repositories.

## Decisions

- Classification, not silence: exit 0 WITH a printed "SKIPPED-RUST" line
  naming the command and the reason (JS parser cannot evaluate rust).
- Mixed repos (JS + rust files): JS files evaluated normally; rust files noted
  in the same loud line. JS zero-files rules unchanged.
- No parser changes: the JS parser is untouched; classification happens at
  discovery/scan level.

## Boundaries

### Allowed Changes
- src/lint.ts
- src/discovery.ts
- src/cli.ts
- tests/**
- README.md
- package.json
- CHANGELOG.md
- dist/**

### Forbidden
- src/rules/** and src/parser.ts (six rules + parser semantics)
- The zero-files loud guard semantics for JS repos

## Completion Criteria

Scenario: rust-only repo classifies skipped
  Test: lint_classifies_rust_only_repo_as_skipped
  Given a fixture cargo repo whose tests are rust files
  When lint runs
  Then exit 0 with a SKIPPED-RUST line naming command + reason

Scenario: js repos keep the loud guard
  Test: lint_zero_files_still_fails_loud_for_js
  Given a JS repo with no test files
  When lint runs
  Then exit 1 loud (unchanged 067 semantics)

Scenario: mixed repo evaluates js
  Test: lint_mixed_repo_evaluates_js_notes_rust
  Given a repo with both js and rust test files
  When lint runs
  Then js files are evaluated and the loud line notes the rust skip

Scenario: readme documents it
  Test: readme_documents_rust_classification
  Given README.md
  When read
  Then the SKIPPED-RUST classification is documented

Scenario: gates hold
  Test: tsc_and_build_clean
  When bunx tsc --noEmit and bunx tsc run
  Then both exit 0
