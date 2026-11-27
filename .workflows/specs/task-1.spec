spec: task
name: "repo-format-gate"
tags: [dprint, format, gate]
verify: "mise exec -- dprint check --list-different && mise exec -- bash scripts/check-drift.sh && mise exec -- bun test tests/mise-tasks.test.ts tests/tree-check.test.ts"
max-rounds: 2
---

## Intent

Add a pinned, read-only dprint format gate for TS/JS/MJS/JSON only. Write the five named tests RED against the current repo, then extend the mise task, hook, tree, and config surfaces until GREEN.

## Decisions

- dprint is a mechanical read-only check gate; it never substitutes for reviewer judgment, and no worker auto-formats outside an explicitly contracted formatting task.
- Repo scope is exactly `**/*.ts`, `**/*.js`, `**/*.mjs`, `**/*.json`; Markdown is excluded and `scripts/docs-lint.sh` remains the sole Markdown authority.
- The dprint CLI is pinned in `mise.toml` at `dprint = "0.65.0"`; `dprint.json` uses native TypeScript/JSON config only and has no exec or process plugin key or value.
- `.mise/tasks/format-check` runs `dprint check --list-different`; `.mise/tasks/format` is an explicit `dprint fmt` task and is never invoked by `ci`, `ci-lite`, or pre-commit.
- `.mise/tasks/ci` and `.mise/tasks/ci-lite` run `mise run format-check` before `./scripts/check-drift.sh`; `.githooks/pre-commit` checks only staged TS/JS/MJS/JSON with `dprint check --list-different`.
- `.workflows/tree.json` adds `dprint.json` to `files` and changes no other manifest entry.
- TDD is RED first: all five selectors exist and fail before the GREEN edits; no dprint-reported file outside Allowed Changes is edited, it is reported to the orchestrator.

## Boundaries

### Allowed Changes
- mise.toml
- dprint.json
- .mise/tasks/format-check
- .mise/tasks/format
- .mise/tasks/ci
- .mise/tasks/ci-lite
- .githooks/pre-commit
- .workflows/tree.json
- tests/mise-tasks.test.ts
- tests/tree-check.test.ts

### Forbidden
- docs/**
- README.md
- skills/**
- agents/**
- scripts/docs-lint.sh
- scripts/check-drift.sh
- CHANGELOG.md
- any path outside Allowed Changes

## Completion Criteria

Scenario: dprint CLI pin and native read-only scope
  Test: test_dprint_pin_and_config
  Given `mise.toml` is read as text and `dprint.json` is parsed as JSON
  When the test extracts the `[tools]` section and config keys
  Then the `[tools]` section contains exactly one dprint assignment, `dprint = "0.65.0"`
  And no line in `mise.toml` assigns `dprint` to any other version
  And `config.includes` equals `["**/*.ts", "**/*.js", "**/*.mjs", "**/*.json"]` in that order
  And `config` has own properties `typescript` and `json`
  And `config` has no own property matching `/markdown/i`
  And no key or string value in `config` matches `/exec|process/i`
  And `JSON.stringify(config)` does not contain `dprint-plugin-exec`

Scenario: Negative — format-check never writes and format is never auto-invoked
  Test: test_format_tasks_read_only
  Given `.mise/tasks/format-check` and `.mise/tasks/format` exist as executable file tasks
  When the test reads both sources
  Then each source starts with `#!/usr/bin/env bash\n` and contains `set -euo pipefail`
  And each source matches `/^#MISE description="[^"]+"$/m` and `/^# Usage: mise run (format-check|format)$/m`
  And the `format-check` source matches `/dprint\s+check\s+--list-different/`
  And the `format-check` source does not match `/\bdprint\s+(?:fmt|format)\b|--write|--staged|--dirty/`
  And the `format` source matches `/\bdprint\s+fmt\b/`
  And the `format` source does not match `/--staged|--dirty/`
  And the `format` source does not contain `mise run format-check` or `dprint check`

Scenario: ci and ci-lite include the read-only gate before the existing chain
  Test: test_ci_chain_includes_format_check
  Given `.mise/tasks/ci` and `.mise/tasks/ci-lite` are file tasks
  When the test reads both sources and indexes exact command lines
  Then each source contains the exact line `mise run format-check`
  And in each source the index of `mise run format-check` is greater than the index of `set -euo pipefail` and less than the index of `./scripts/check-drift.sh`
  And `ci` contains `./scripts/check-drift.sh`, `./scripts/docs-lint.sh`, `./scripts/agents-lint.sh AGENTS.md`, and `bun test` in that order
  And `ci-lite` contains `./scripts/check-drift.sh`, `./scripts/docs-lint.sh`, and `./scripts/agents-lint.sh AGENTS.md` in that order and does not contain `bun test`
  And neither source contains a line equal to `mise run format` and neither source contains `dprint fmt` or `dprint format`

Scenario: Negative — pre-commit checks staged source only and applies no writes
  Test: test_precommit_staged_read_only
  Given `.githooks/pre-commit` is read as text
  When the test inspects its shell lines
  Then it contains the exact assignment `staged="$(git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.js' '*.mjs' '*.json')"`
  And it contains the exact guard line `if [ -n "$staged" ]; then`
  And it contains `dprint check --list-different` after that guard
  And it does not contain `dprint fmt`, `dprint format`, `--staged`, `--dirty`, or `--write`
  And it preserves a line matching `/scripts\/wf\.sh wip message/` and the final line `exec "$REPO_ROOT/scripts/check-drift.sh"`

Scenario: tree manifest and pinned test selectors
  Test: test_tree_manifest_and_scope
  Given `.workflows/tree.json` is parsed as JSON and both test files are read as text
  When the test compares manifest arrays and searches selector declarations
  Then sorted `manifest.files` equals sorted `[".gitignore", "AGENTS.md", "CHANGELOG.md", "CONTRACTS", "LICENSE", "README.md", "dprint.json", "mise.toml", "package.json"]`
  And `manifest.roots` equals `[".githooks", ".mise", "agents", "asset", "diagrams", "docs", "extensions", "fixtures", "models", "prompts", "scripts", "skills", "templates", "tests", "tooling"]`
  And `manifest.ignore` equals `[".pi", ".seecode", ".workflows", "node_modules"]`
  And `tests/mise-tasks.test.ts` contains `test("test_dprint_pin_and_config"`, `test("test_format_tasks_read_only"`, `test("test_ci_chain_includes_format_check"`, and `test("test_precommit_staged_read_only"`
  And `tests/tree-check.test.ts` contains `test("test_tree_manifest_and_scope"`
  And none of those five declarations is marked `.skip` or `.todo`
