spec: task
name: gate-accuracy-batch
tags: [agent-spec, boundaries, guard]
verify: "cargo test --quiet && cargo clippy --all-targets -- -D warnings"
max-rounds: 2
---

## Intent

An Allowed-Changes entry that names a file must protect that file, whatever its
extension; and guard's own evidence run must not pollute itself with the
target repo's fixture failures.

## Decisions

- Matcher rule (fail-closed semantics preserved): an Allowed entry is a path
  boundary when it contains `/` or `*`, starts with a dot (0.3.1 behavior),
  OR its final segment contains a dot (a file extension — README.md,
  package.json, Cargo.toml, Cargo.lock, vitest.config.ts). A bare word with
  no dot in any segment ("the parser module") stays prose. Extension-bearing
  entries anchor to the EXACT file (not a directory prefix).
- The `./` prefix keeps working (068/069 archived specs rely on it) — pin it.
- Guard's runner evidence ignores target-repo paths matching
  `**/fixtures/**` by default (documented; the sweep was polluting guard
  stdout with pre-existing fixture failures from unrelated repos).
- Version 0.3.4 + CHANGELOG. Cargo.lock pre-authorized.

## Boundaries

### Allowed Changes
- src/spec_verify/**
- src/spec_gateway/**
- tests/**
- docs/**
- ./CHANGELOG.md
- ./Cargo.toml
- ./Cargo.lock

### Forbidden
- Exit semantics of guard or lint (fail-closed stays fail-closed)
- pi-workflows spec files (the archived ./ prefixes stay canonical)

## Completion Criteria

Scenario: a bare filename boundary protects its exact file
  Test: test_bare_filename_boundary_matches_exact_file
  Given an Allowed entry `README.md` and a changed file README.md
  When guard checks the change set
  Then the change is covered (today: "not covered by any allowed boundary")

Scenario: extension-bearing entries anchor across the observed set
  Test: test_extension_bearing_entries_anchor
  Given Allowed entries CHANGELOG.md, package.json, Cargo.toml, Cargo.lock, vitest.config.ts
  When each exact file changes
  Then each is covered

Scenario: prose stays prose
  Test: test_prose_entries_stay_prose
  Given an Allowed bullet "the parser module" (no dot, no slash)
  When a file named parser-module is changed
  Then it is still uncovered (no prose-to-path regression)

Scenario: dotfile and annotation behavior preserved
  Test: test_dotfile_and_annotation_behavior_preserved
  Given the 0.3.1 pins (dotfiles are paths; trailing annotations are prose)
  When the matcher runs
  Then both behaviors are unchanged

Scenario: the ./ prefix keeps working
  Test: test_dot_prefix_still_matches
  Given an Allowed entry ./README.md
  When README.md changes
  Then the change is covered

Scenario: guard evidence ignores fixtures
  Test: test_guard_runner_excludes_fixtures
  Given a target repo with tests/fixtures/** containing failing files
  When guard collects test evidence
  Then fixture paths are excluded from the run and the exclusion is documented

Scenario: clippy and fmt stay clean
  Test: clippy_fmt_clean
  When cargo clippy --all-targets -- -D warnings and cargo fmt --check run
  Then both exit 0
