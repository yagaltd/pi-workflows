spec: task
name: "just-command-surface"
tags: [dx, command-runner, just]
verify: "just --summary && just ci"
---

## Intent

Add a root `justfile` as the single command entrypoint wrapping the repo's existing guard scripts. No new logic: recipes call `scripts/*` verbatim; scripts stay canonical.

## Decisions

- Recipe set is exactly seven: `ci`, `drift`, `docs`, `agents`, `test`, `flow`, `docs-if-touched`; no doc-comments on recipe lines (keeps `just --summary` deterministic for linting).
- `ci` = `check-drift.sh` + `docs-lint.sh` + `agents-lint.sh AGENTS.md` + `bun test`, in that order.
- `drift` = `check-drift.sh`; `docs` = `check-drift.sh` + `docs-lint.sh`; `agents` = `agents-lint.sh AGENTS.md`; `test` = `bun test`.
- `flow <slug>` = `flow-validate.mjs .workflows/flows/<slug>.json` then `flow-run.mjs .workflows/flows/<slug>.json` (validate before run, same order).
- `docs-if-touched` = `if git diff --name-only HEAD -- docs/ prompts/ skills/ agents/ README.md CHANGELOG.md | grep -q .; then just docs; fi` — exits 0 with no guards run on a clean tree; guard failure propagates non-zero (never silent-pass).
- Default (no-arg) recipe prints the recipe list.

## Boundaries

### Allowed Changes
- justfile (new file)

### Forbidden
- Do not modify anything under scripts/ (scripts stay canonical)
- Do not touch .github/, package.json, CHANGELOG.md, AGENTS.md, skills/
- Do not add recipe logic beyond single-command wrappers
- Do not modify flow-gates.mjs (stays hardcoded)

## Completion Criteria

Scenario: summary lists exactly the seven recipes in source order
  Test: test "$(just --unsorted --summary)" = "ci drift docs agents test flow docs-if-touched"
  Given the repo root (just ≥ 1.59 — --summary sorts alphabetically by default; --unsorted returns source order)
  When running just --unsorted --summary
  Then output is exactly "ci drift docs agents test flow docs-if-touched"

Scenario: ci recipe wraps the four gates in order
  Test: test "$(just -n ci 2>&1 | grep -c -e check-drift.sh -e docs-lint.sh -e agents-lint.sh -e 'bun test')" -eq 4
  Given the justfile exists
  When running just -n ci (dry-run)
  Then all four gate commands appear: check-drift.sh, docs-lint.sh, agents-lint.sh AGENTS.md, bun test

Scenario: docs recipe wraps the two doc guards
  Test: test "$(just -n docs 2>&1 | grep -c -e check-drift.sh -e docs-lint.sh)" -eq 2
  Given the justfile exists
  When running just -n docs (dry-run)
  Then both doc guards appear

Scenario: flow recipe validates before it runs
  Test: just -n flow x 2>&1 | head -1 | grep -q flow-validate.mjs
  Given the justfile exists
  When running just -n flow x (dry-run, slug "x")
  Then the first command is flow-validate.mjs with .workflows/flows/x.json

Scenario: just ci exits 0 on the current clean tree
  Test: just ci
  Given the working tree passes all four gates today
  When running just ci
  Then exit code is 0 and all gates print their ok lines

Scenario: docs-if-touched no-op on clean doc paths
  Test: git diff --quiet -- docs/ prompts/ skills/ agents/ README.md CHANGELOG.md
  Given no changes under the doc surfaces
  When running just docs-if-touched
  Then exit code is 0 and no guard output is printed

Scenario: unknown recipe fails loud
  Test: just no-such-recipe-xyz 2>/dev/null; test $? -ne 0
  Given the justfile exists
  When invoking a recipe that does not exist
  Then just exits non-zero

Scenario: negative — guard failure propagates through a recipe
  Test: ! grep -qE '\|\| true' justfile
  Given just recipes abort on the first failing line by default
  When any gate inside ci or docs fails
  Then the recipe exits non-zero — the justfile contains no `|| true` swallow anywhere
