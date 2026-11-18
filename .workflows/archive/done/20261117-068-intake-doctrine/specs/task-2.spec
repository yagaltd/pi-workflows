spec: task
name: frozen-spec-carve-out
tags: [agent-spec, decision, docs]
verify: "cargo test --quiet && cargo clippy --all-targets -- -D warnings"
max-rounds: 2
---

## Intent

The boundaries-path rule applies to living specs; historical specs whose
scenarios cite example paths are frozen and marked, so guard noise on archived
specs ends without weakening the rule for new work.

## Decisions

- Enumerate the affected historical specs mechanically (the lint that flagged
  them) — expected: the specs/ + specs/roadmap/ files reported during plan 067
  TASK 4; re-run the enumeration, do not trust the stale list.
- Mark each affected spec with a durable, machine-checkable frozen marker in
  its frontmatter (a `frozen: <date/plan>` style key or the repo's existing
  convention — pick one form and state it in docs).
- Add ONE integration test that iterates specs/ (and roadmap) asserting every
  boundaries-path-flagged file carries the marker — red first (0 markers),
  green after. This makes the decision mechanically durable, and dogfoods the
  doc-scenario pin rule: the selector binds to a real test.
- Document the decision: docs note (what frozen means: guard/lifecycle apply to
  new and revised specs; frozen specs are historical record) + CHANGELOG entry.
  No version bump for a docs+test-only change unless repo convention says
  otherwise; state the choice.

## Boundaries

### Allowed Changes
- specs/**
- docs/**
- CHANGELOG.md
- tests/**

### Forbidden
- src/** (the boundaries-path rule itself is NOT changed — frozen is scope,
  not a rule carve-out)
- Any version bump without a code change

## Completion Criteria

Scenario: flagged specs carry the frozen marker
  Test: test_frozen_specs_are_marked
  Given every spec the boundaries-path rule flags
  When the integration test iterates them
  Then each carries the frozen marker and the test passes

Scenario: the decision is documented
  Test: test_frozen_decision_documented
  Given docs/** and CHANGELOG.md
  When read
  Then the frozen semantics (applies to new/revised specs only) are stated and dated

Scenario: the rule is untouched
  Test: test_rule_untouched
  Given src/**
  When diffed against base
  Then no changes (frozen is scope, not a carve-out in the rule)

Scenario: clippy stays clean
  Test: clippy_fmt_clean
  When cargo clippy --all-targets -- -D warnings and cargo fmt --check run
  Then both exit 0
