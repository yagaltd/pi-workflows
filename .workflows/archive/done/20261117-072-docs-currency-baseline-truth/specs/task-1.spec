spec: task
name: docs-currency-baseline-regen
tags: [docs, baseline, reply-style]
verify: "bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh"
max-rounds: 2
---

## Intent

README and docs describe the current state (intake doctrine, reply-style
vocabulary, the pi-emphasis companion); the baseline budgets track measured
truth again; the baseline rule in the doctrine test is generalized from
additions-only to the real invariant (monotone decrease).

## Decisions

- Companion framing: pi-emphasis is the RECOMMENDED companion extension for
  reply rendering — display-only, installed stock (`pi install
  git:github.com/johnlindquist/pi-emphasis`), NOT a package dependency; the
  vocabulary mapping lives in templates/STATUS-VOCABULARY.md; without the
  extension, pill tokens render as plain text and nothing breaks.
- Baseline regen is content-truth: run --write-baseline AFTER the docs edits,
  prove determinism (two consecutive runs, byte-identical), commit the
  lowered numbers. Lowering is the expected direction (068/069 improvements
  were never priced in).
- Pin generalization: replace test_baseline_additions_only with
  test_baseline_monotone — the standing invariant is budgets only ever
  DECREASE per file and docs-lint stays CLEAN; document in the pin comment
  that a regen task is legitimate when its plan authorizes rewrites.

## Boundaries

### Allowed Changes
- README.md
- docs/architecture.md
- docs/canon.md
- templates/DOCS-POLICY.md
- scripts/docs-lint-baseline.json
- tests/prompt-doctrine.test.ts

### Forbidden
- scripts/docs-lint.sh and mise.toml (tools verified pinned-current — no
  version work exists)
- CHANGELOG.md (the release entry is written at SHIP)
- Raising any baseline number above its HEAD value

## Completion Criteria

Scenario: README names the companion
  Test: test_readme_names_emphasis_companion
  Given README.md
  When read
  Then it names pi-emphasis with the install command, the display-only and
  optional framing, and cites templates/STATUS-VOCABULARY.md

Scenario: README currency reflects current doctrine
  Test: test_readme_currency_current
  Given README.md
  When read against the shipped features
  Then the intake-doctrine, reply-style/scoreboard, and ledger concepts are
  present (concept pins, not version numbers)

Scenario: budgets track truth and are deterministic
  Test: test_baseline_regenerated_deterministic
  Given the docs edits are final
  When --write-baseline runs twice
  Then the two outputs are byte-identical and docs-lint is CLEAN, with at
  least one pre-existing number LOWER than HEAD (the stale budgets corrected)

Scenario: the baseline pin is generalized
  Test: test_baseline_pin_monotone
  Given tests/prompt-doctrine.test.ts
  When read
  Then no additions-only-vs-HEAD assertion remains and the monotone rule is
  what the pin enforces

Scenario: the clean-files cross-ref lands
  Test: test_docs_policy_crossref_lands
  Given templates/DOCS-POLICY.md
  When read
  Then it carries the chat-reply-decoration pointer to the vocabulary rule
  (closes the 071 adjudication)

Scenario: gates stay green
  Test: test_gates_stay_green
  When bun test, check-drift and docs-lint run
  Then all exit 0
