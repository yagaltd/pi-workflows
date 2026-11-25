spec: task
name: "rust-gate-brownfield-adopt-draft"
tags: [rust, init, brownfield]
verify: "bun test tests/init-extract.test.ts && git diff --exit-code -- extensions/index.ts scripts/profile-lint.sh scripts/flow-gates.mjs && test ! -e .deslop-please.allow"
max-rounds: 2
---

## Intent

Extend brownfield `/init --adopt` extraction so a detected Rust workspace drafts the structural gate marker, the extended Rust skill family, and the canonical charter rule. Non-Rust drafts stay byte-identical.

## Decisions

- Gate on both `Cargo.toml` detection and resolved Rust stack.
- Add a top-level draft-only `architectureGate` marker to the profile draft; do not add schema, commands, gates, or generated allow files.
- Add `rust-crate-architecture` to the Rust `reviewSkills` array in the draft.
- Add the canonical Rust gate sentence to the charter draft only for Rust.

## Boundaries

### Allowed Changes
- .workflows/specs/task-2.spec
- scripts/init-extract.ts
- tests/init-extract.test.ts

### Forbidden
- .workflows/plan.md
- extensions/index.ts
- scripts/profile-lint.sh
- scripts/flow-gates.mjs
- generated allow files
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: Rust adopt profile marker is drafted
  Test: test_adopt_rust_profile_marker
  Given a brownfield fixture with a Cargo manifest and detected Rust stack
  When the adopt draft is generated
  Then the profile draft has a top-level architectureGate marker naming deslop-please and rust-analyzer
  And commands and gates entries are unchanged

Scenario: Rust adopt review skills include crate architecture
  Test: test_adopt_rust_review_skills
  Given the same Rust fixture
  When the adopt draft is generated
  Then reviewSkills contains rust-review, rust-best-practices, rust-port, rust-crate-architecture
  And no installed skill is invented beyond the owner-confirmed install

Scenario: Rust adopt charter carries the gate
  Test: test_adopt_rust_charter_gate
  Given the same Rust fixture
  When the charter draft is generated
  Then its PROJECT block contains the canonical Rust gate sentence
  And the review-pointers line cites the extended Rust skill family

Scenario: non-Rust adopt output is unchanged
  Test: test_adopt_non_rust_unchanged
  Given a TypeScript brownfield fixture
  When the adopt draft is generated
  Then no architectureGate marker appears
  And reviewSkills and the charter draft match the pre-change output

Scenario: forbidden surfaces stay untouched
  Test: test_adopt_no_forbidden_changes
  Given the task branch
  When forbidden paths are inspected
  Then the judge schema, profile linter, flow-gates parser, and allow files are unchanged
