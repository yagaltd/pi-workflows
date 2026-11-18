spec: task
name: plan-check-sieve-grammar
tags: [agent-spec, plan-check]
verify: "cargo test --quiet && cargo clippy --all-targets -- -D warnings"
max-rounds: 2
---

## Intent

When a plan carries a Sieve section, plan-check validates its grammar; a
parked outcome in a plan file is an error, because parked ideas are ledger
rows, never plans.

## Decisions

- Normative grammar from pi-workflows plan 20261117-073 Execution Notes:
  table rows V/R/E/path with the four enums; an `Outcome:` line ∈ {propose,
  build-direct}; `park` as Outcome → plan-check error ("parked ideas are
  ledger rows"). Absence of the section → no-op (non-proposal plans legal).
- Table-driven like validate_ledger_resolution (header-driven, trimmed
  cells); errors name the cell and line.

## Boundaries

### Allowed Changes
- src/main.rs
- tests/**
- docs/**
- ./CHANGELOG.md
- ./Cargo.toml
- ./Cargo.lock

### Forbidden
- Lifecycle/verify/guard semantics
- Rejecting plans WITHOUT a Sieve section

## Completion Criteria

Scenario: valid sieve passes
  Test: plan_check_valid_sieve_section_passes
  Given a plan with a well-formed Sieve section (propose outcome)
  When plan-check runs
  Then exit 0

Scenario: park outcome is an error
  Test: plan_check_park_outcome_is_error
  Given a plan whose Sieve Outcome is park
  When plan-check runs
  Then exit non-zero naming the outcome and the ledger-instead rule

Scenario: malformed enums are errors
  Test: plan_check_malformed_sieve_enums_are_errors
  Given V=must or E=huge
  When plan-check runs
  Then exit non-zero naming the cell

Scenario: absence is legal
  Test: plan_check_ignores_missing_sieve
  Given a plan without a Sieve section
  When plan-check runs
  Then no-op

Scenario: gates hold
  Verify-line-governed (no test selector — rust convention per fix-round-069
  item 1): the gates ARE the verify line, executed by the reviewer.
  When cargo clippy --all-targets -- -D warnings and cargo fmt --check run
  Then both exit 0
