spec: task
name: language-coverage-batch
tags: [tdd-guard, lint, verify]
verify: "bunx vitest run && bunx tsc --noEmit && bunx tsc"
max-rounds: 2
---

## Intent

Python repos get the same honest classification rust got; the selector match
stops false-positiving on longer names; the package lock tells the truth.

## Decisions

- SKIPPED-PY mirrors SKIPPED-RUST: scan-level classification, exit 0 with a
  loud line naming command + reason. Detection: every discovered test file is
  .py, or pyproject.toml present at cwd with zero JS-parseable files. Mixed
  repos: python noted, JS evaluated normally. JS zero-files guard untouched.
- verify selector resolution: the allTestContent.includes(selector) leg is
  replaced by a word-anchored match (escaped selector, \b at both ends) —
  selector test_my_pin must NOT match content containing only
  test_my_pin_extended. Exact-name and cargo-listing legs unchanged.
- package-lock.json root "version" synced to package.json in the same bump
  (0.1.6), and a pin keeps them equal going forward.

## Boundaries

### Allowed Changes
- src/lint.ts
- src/verify.ts
- tests/**
- README.md
- package.json
- package-lock.json
- CHANGELOG.md
- dist/**

### Forbidden
- src/parser.ts (T2's lane — the idiom unwrap)
- src/rules/**, src/discovery.ts
- The JS zero-files loud guard semantics

## Completion Criteria

Scenario: python-only repo classifies skipped
  Test: lint_classifies_python_only_repo_as_skipped
  Given a fixture repo with pyproject.toml and test_*.py files
  When lint runs
  Then exit 0 with a SKIPPED-PY line naming command + reason

Scenario: mixed repo evaluates js and notes python
  Test: lint_mixed_repo_evaluates_js_notes_python
  Given js test files plus python test files
  When lint runs
  Then js violations reported and the loud line notes the python skip

Scenario: selector match is word-anchored
  Test: verify_selector_match_is_word_anchored
  Given content containing only test_my_pin_extended
  When verify resolves selector test_my_pin
  Then found=false (today: substring-true — red first)

Scenario: real selectors still resolve
  Test: verify_exact_and_suffix_legs_unchanged
  Given the existing 069 fixture
  When verify resolves exact and ::-suffix selectors
  Then both still found=true (no regression)

Scenario: package lock tells the truth
  Test: package_lock_root_version_synced
  Given package.json and package-lock.json
  When read
  Then root lock version equals package.json version (0.1.6), pinned by test

Scenario: readme documents it
  Test: readme_documents_skipped_py
  Given README.md
  When read
  Then SKIPPED-PY is documented beside SKIPPED-RUST

Scenario: gates hold
  Test: tsc_and_build_clean
  When bunx tsc --noEmit and bunx tsc run
  Then both exit 0
