spec: task
name: docs-floor
tags: [docs, lint, debt]
verify: "bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh"
max-rounds: 2
---

## Intent

The docs debt is paid down to the floor so docs-lint becomes an absolute gate:
budgets land at the measured post-fix counts and no longer hide stock.

## Decisions

- Style and grammar only (markdownlint + harper findings); no meaning drift, no
  restructuring; load-bearing doctrine strings survive unchanged.
- scripts/docs-lint-baseline.json is rewritten to the new per-file counts —
  every number strictly lower than HEAD's, files reaching zero dropped.
- README.md is included by recorded adjudication (fix-round-067): DOCS-POLICY
  same-task rule makes the docs task the owner of README currency; the
  hygiene sweep names it stale. Content additions there are currency fixes
  (what shipped), not redesign.

## Boundaries

### Allowed Changes
- docs/**
- README.md
- templates/**
- agents/**
- skills/**
- prompts/**
- scripts/docs-lint-baseline.json

### Forbidden
- Any behavioral code change (src/**, scripts/** except the baseline, extensions/**)
- package.json, justfile, mise.toml, CHANGELOG.md
- Raising any baseline number

## Completion Criteria

Scenario: budgets land at the floor
  Test: test_docs_lint_budgets_strictly_decrease
  Given scripts/docs-lint-baseline.json after the pass
  When compared against HEAD's baseline
  Then every per-file number is strictly lower, zero files are dropped, and docs-lint exits CLEAN using the new file

Scenario: load-bearing doctrine strings survive
  Test: test_load_bearing_strings_survive
  Given the edited corpus
  When pinned strings are grepped
  Then each still resolves, including the disposition tokens and the registry doctrine lines

Scenario: gates stay green
  Test: test_gates_stay_green
  When bun test, check-drift and docs-lint run
  Then all exit 0
