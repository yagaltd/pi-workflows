spec: task
name: "docs-lint-script"
tags: []
---

## Intent

Add `scripts/docs-lint.sh` — a graceful wrapper that lints the repository's human-facing Markdown (README.md, AGENTS.md, docs/, agents/, skills/, prompts/, templates/) with markdownlint-cli2, lychee (links), and Harper (English prose, advisory by default). Tools that are absent produce skip warnings, never failures. The script exits non-zero only on real tool findings. Hook/CI wiring is out of scope (doc-drift gate, backlog item 4).

## Decisions

- Mirrors the agent-spec docs-lint design: `doc_paths=(README.md AGENTS.md docs agents skills prompts templates)`; per-tool run functions; missing tools append to a skip list.
- Gates: markdownlint-cli2 and lychee findings fail the run. Harper findings fail unless `DOCS_LINT_HARPER_ADVISORY=1` (bilingual/project vocabulary makes prose lint noisy).
- Print a summary of which tools ran, which were skipped.
- Executable bit set; `set -u`; runs from anywhere (resolves its own repo root).

## Boundaries

### Allowed Changes
- scripts/docs-lint.sh

### Forbidden
- Do not modify existing scripts (check-drift.sh, check-spec-selectors.sh, dispatch-ledger.mjs).
- Do not add npm/pip dependencies or config files (markdownlint/lychee configs may come later).

## Completion Criteria

Scenario: script runs green on the current tree
  Test: bash scripts/docs-lint.sh >/dev/null 2>&1
  Given the repository with lint tools possibly absent
  When the script runs
  Then it exits 0 via the graceful-skip path (warnings name the skipped tools)

Scenario: script covers the documented doc paths
  Test: grep -q "README.md" scripts/docs-lint.sh && grep -q "AGENTS.md" scripts/docs-lint.sh && grep -q "docs" scripts/docs-lint.sh
  Given the script source
  When the doc_paths declaration is inspected
  Then README.md, AGENTS.md, and the docs directory are covered

Scenario: advisory knob exists for Harper
  Test: grep -q "DOCS_LINT_HARPER_ADVISORY" scripts/docs-lint.sh
  Given the script source
  When the Harper handling is inspected
  Then the advisory escape hatch is present
