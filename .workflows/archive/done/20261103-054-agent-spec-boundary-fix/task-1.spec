spec: task
name: agent-spec-boundary-matcher-fix
tags: [agent-spec, rust, boundaries, tdd]
verify: "cargo test --lib 2>&1 | tail -2 && cargo install --path . --force"
max-rounds: 3
---

## Intent

Fix two verified defects in agent-spec's boundary matcher so non-Cargo repos (JS/TS/Python, git worktrees) get correct boundary verdicts with repo-relative paths.

## Decisions

- `find_workspace_root` (src/spec_verify/boundaries.rs:251): detect the workspace root as the first ancestor where `.git` EXISTS (file OR dir — git worktrees carry a .git FILE) OR `Cargo.toml` is_file. Cargo-only fallback retained for bare crates; detection order: .git first, then Cargo.toml, per ancestor level.
- Decorated bullets: `normalize_pattern` extracts the FIRST backtick span as the pattern when present (`` `src/**` — all source changes `` → `src/**`); no backticks → existing trim/backslash/slash behavior unchanged.
- Unify the duplicated normalize_pattern + looks_like_path_boundary (boundaries.rs + spec_gateway/plan.rs:124) into one shared implementation in spec_verify; plan.rs re-uses it (subtract-first).
- Regression tests (cargo, in boundaries.rs + plan.rs test modules): (a) find_workspace_root returns the dir containing a .git FILE (worktree simulation); (b) normalize_change_paths on absolute paths under a deep non-Cargo root → repo-relative; (c) decorated bullet → clean pattern; (d) bare Cargo.toml crate still detected; (e) plain patterns byte-identical to before (no regression).
- No new dependencies; no API/CLI changes; existing 207+ lib tests stay green (4 documented pre-existing bin/api failures unchanged).

## Boundaries

### Allowed Changes
- src/spec_verify/boundaries.rs
- src/spec_gateway/plan.rs
- (in-file test modules only)

### Forbidden
- Do not touch src/main.rs, scripts/judge.mjs, any pi-workflows files, Cargo.toml deps
- No commits — leave the working tree uncommitted for gate review

## Completion Criteria

Scenario: worktree root detected via .git file
  Test: find_workspace_root detects .git-file worktree root
  Given a dir tree whose .git is a FILE (git worktree form) at ancestor N
  When find_workspace_root walks from a descendant path
  Then it returns ancestor N (no Cargo.toml needed)

Scenario: deep non-Cargo repo gets repo-relative changes
  Test: normalize_change_paths repo-relative after root detection
  Given absolute changed paths under the detected root
  When normalize_change_paths runs
  Then results are root-relative (no home/aurel prefix)

Scenario: decorated bullet extracts backtick pattern
  Test: decorated bullet → clean pattern
  Given item.text "`src/**` — all source changes"
  When normalize_pattern runs
  Then pattern = "src/**"

Scenario: no regression
  Test: bare Cargo crate + plain patterns unchanged
  Given a bare Cargo.toml crate tree and plain patterns
  When the fns run
  Then detection and patterns match pre-fix behavior
