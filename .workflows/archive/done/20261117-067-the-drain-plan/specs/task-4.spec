spec: task
name: boundaries-lint-and-ledger-check
tags: [agent-spec, lint, boundaries]
verify: "cargo test --quiet && cargo clippy --all-targets -- -D warnings"
max-rounds: 2
---

## Intent

A spec whose criterion depends on a path its own Boundaries forbid is caught at
lint time, and a plan's Ledger Resolution section is validated mechanically.

## Decisions

- New rule in the existing `spec_lint::LintPipeline` (no new subcommand):
  collect backticked tokens from Intent, Scenarios and Completion Criteria; a
  token is path-like when it contains `/`, has no `://`, and has no space.
  A path-like token resolving OUTSIDE every Allowed Changes entry (entry
  prefixes cover descendants; `**` globs honored) is an error-level finding.
  Backticked commands (`cargo test`) and URLs are never flagged.
- plan-check validates a plan's `## Ledger Resolution` when present: every
  row's Disposition must match done(<ref>) / closed(<reason>) /
  deferred(trigger: <condition>); a missing section is a no-op; malformed rows
  fail with row numbers.
- Version 0.3.2; CHANGELOG records the plan-064 class (4 review rounds).

## Boundaries

### Allowed Changes
- src/spec_lint/**
- src/main.rs
- tests/**
- Cargo.toml
- CHANGELOG.md

### Forbidden
- spec_parser, spec_verify, lifecycle semantics
- Any new subcommand (the rule joins the existing lint pipeline)

## Completion Criteria

Scenario: a criterion path outside Allowed is flagged
  Test: lint_flags_path_outside_allowed
  Given a spec whose criterion cites docs/api.md while Allowed lists only src/**
  When the pipeline runs
  Then the report carries an error naming the path

Scenario: paths inside Allowed or its globs pass
  Test: lint_accepts_paths_inside_allowed
  Given criteria citing src/x.rs with Allowed src/** and docs/a.md with Allowed docs/**
  When the pipeline runs
  Then no boundaries findings

Scenario: commands and URLs are never flagged
  Test: lint_ignores_commands_and_urls
  Given criteria citing `cargo test` and https://example.com/a.md
  When the pipeline runs
  Then no boundaries findings

Scenario: plan-check validates ledger tokens
  Test: plan_check_validates_ledger_tokens
  Given a plan with ## Ledger Resolution rows using valid tokens and one malformed row
  When plan-check runs
  Then it exits non-zero naming the malformed row, and passes fully-valid sections

Scenario: missing section is a no-op
  Test: plan_check_ignores_missing_section
  Given a plan without ## Ledger Resolution
  When plan-check runs
  Then no ledger findings

Scenario: clippy and fmt stay clean
  Test: clippy_fmt_clean
  When cargo clippy --all-targets -- -D warnings and cargo fmt --check run
  Then both exit 0
