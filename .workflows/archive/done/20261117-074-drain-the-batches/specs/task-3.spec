spec: task
name: plan-check-docs
tags: [agent-spec, docs]
verify: "cargo test --quiet && cargo clippy --all-targets -- -D warnings"
max-rounds: 2
---

## Intent

plan-check — the CLI gate that validates plan structure — gets a documentation
page covering every section it validates, so its contracts are readable.

## Decisions

- docs/plan-check.md (new): the command, all four validated sections
  (Dependencies, Ledger Resolution, Bottleneck, Sieve) with their grammars
  and error shapes (real examples from the tests), when sections are
  optional vs mandatory, and the cross-links (ledger rule: parked ideas are
  ledger rows; disposition token grammar).
- docs-only change: CHANGELOG Unreleased entry, no version bump (070
  precedent for docs+test-only — this task adds one docs-pin test, which
  rides the same rule).

## Boundaries

### Allowed Changes
- docs/**
- tests/**
- ./CHANGELOG.md

### Forbidden
- src/** (documentation of existing behavior only — if the docs contradict
  the code, that is a finding, not a fix)

## Completion Criteria

Scenario: the docs page exists and covers all sections
  Test: plan_check_docs_page_documents_sections
  Given docs/plan-check.md
  When the pin test reads it
  Then all four validated sections, their option flags, and the
  parked-ideas-are-ledger-rows rule are documented with real error examples

Scenario: docs match the code
  Test: reviewer-verifiable
  Given docs/plan-check.md
  When the reviewer checks claims against src/main.rs
  Then no contradiction (docs contradicting code is a finding, not a fix)

Scenario: gates hold
  Test: clippy_fmt_clean
  When cargo clippy --all-targets -- -D warnings and cargo fmt --check run
  Then both exit 0
