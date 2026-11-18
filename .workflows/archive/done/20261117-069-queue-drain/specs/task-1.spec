spec: task
name: lint-per-file-continue
tags: [agent-spec, lint, defect]
verify: "cargo test --quiet && cargo clippy --all-targets -- -D warnings"
max-rounds: 2
---

## Intent

A multi-file lint run reports on every file it can process and names every
file it cannot — silent under-reporting is the vacuous-pass class by another
door.

## Decisions

- cmd_lint collects per-file results: parse failures are recorded (file +
  reason), NOT propagated; the run continues; output includes each good file's
  report plus an error list naming every bad file; exit non-zero when any lint
  errors OR any parse failures occurred.
- The gate-scope decision is documented: guard scans specs/ top level (active
  contracts); specs/roadmap/ is intentionally outside gate scope (staged
  future work) and is enumerated per-file by lint when passed explicitly.
- Version 0.3.3 (code change) + CHANGELOG.
- Cargo.lock is pre-authorized in Allowed (boundary generosity — the version
  bump syncs it; plan 067's round was spent learning this).

## Boundaries

### Allowed Changes
- src/main.rs
- src/spec_lint/**
- tests/**
- docs/**
- ./CHANGELOG.md
- ./Cargo.toml
- ./Cargo.lock

### Forbidden
- Rule semantics (boundaries-path and the rest of the pipeline unchanged)
- Guard's directory recursion (the roadmap exclusion is documented, not
  removed — a decision, not a code change)

## Completion Criteria

Scenario: good files are processed despite a bad one
  Test: test_multi_file_lint_continues_past_parse_failures
  Given a directory with a valid spec, a frontmatter-less file, and another valid spec
  When lint runs over all three
  Then both valid files receive full reports and the run does not abort

Scenario: every bad file is named
  Test: test_multi_file_lint_names_all_bad_files
  Given two unparseable files among valid ones
  When lint runs
  Then exit is non-zero naming BOTH bad files with their reasons

Scenario: gate scope is documented
  Test: test_gate_scope_documented
  Given the docs
  When read
  Then the guard top-level scope and the roadmap exclusion are stated with their rationale, pinned by a docs-reading test
