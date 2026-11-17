spec: task
name: tdd-guard-vacuous-lint-fix
tags: [tdd-guard, lint, defect]
verify: "bunx vitest run && bunx tsc --noEmit"
max-rounds: 2
---

## Intent

tdd-guard lint must see test files no matter where it runs, and must never pass
vacuously: a run that finds zero test files fails loudly, not silently.

## Decisions

- Root cause: `.includes(".git")` runs on ABSOLUTE paths. Fix by filtering on
  path SEGMENTS of the relative path: a component exactly `.git` (or
  `node_modules`) is excluded — `.github/`, `digit.ts`, and
  `.git/subagents/<run>/<worker>/tests/**` all survive.
- Discovery default: when `--tests` is not explicitly passed and `tests/` is
  absent, probe `test/`, then src-colocated — explicit flag always wins.
- Zero files found = loud failure with a clear message and an `--allow-empty`
  escape; silent vacuous passes are extinct.
- Version 0.3.2 of nothing — this is tdd-guard 0.1.2; CHANGELOG records the
  defect class (the gate could not see its own test files in worktrees).

## Boundaries

### Allowed Changes
- src/lint.ts
- src/cli.ts
- src/config.ts
- tests/**
- package.json
- CHANGELOG.md
- dist/**

### Forbidden
- Rule semantics (the six lint rules keep their behavior)
- mutator/verify runner logic beyond shared discovery

## Completion Criteria

Scenario: lint sees tests under a worktree path
  Test: lint_finds_tests_under_dot_git_cwd
  Given a fixture project at <tmp>/.git/subagents/run_x/worker with tests/a.test.ts
  When lint runs from there
  Then it finds the file and applies the rules (today: 0 files, vacuous pass)

Scenario: the filter is segment-precise
  Test: lint_filter_is_segment_precise
  Given files under .github/ and a file named digit.ts
  When lint runs
  Then neither is excluded by the .git substring

Scenario: discovery probes when tests/ is absent
  Test: discovery_probes_test_dir_then_src
  Given a project with test/ or colocated src tests but no tests/
  When lint runs with no --tests flag
  Then files are found without the flag

Scenario: zero files fail loudly
  Test: lint_zero_files_fails_loudly
  Given a project with no test files at all
  When lint runs without --allow-empty
  Then it exits non-zero with a message naming the scanned roots
