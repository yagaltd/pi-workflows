spec: task
name: status-vocabulary
tags: [doctrine, vocabulary, reply-style]
verify: "bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh"
max-rounds: 2
---

## Intent

One table maps every pi-workflows status to its pill word; ship reports open
with a scoreboard line; repo files never carry pills — so replies scan and
files stay clean, with the vocabulary as the single source both the rules and
any future checker read.

## Decisions

- `templates/STATUS-VOCABULARY.md` is the single source. Mapping (pi-workflows
  token → pill): `done(<ref>)` → [[Done]]; gate pass / `ok:true` → [[Passed]];
  release → [[Shipped]]; merged branch → [[Merged]]; queued (P0–P2, owner call)
  → [[Decision]] with the unblocking action as **Do:**; `deferred(trigger:)` →
  [[Pending]] with the trigger restated; `closed(<why>)` → [[Keep]] with the
  why; gate skip → [[Skipped]] with **Run:**; P2 risk → [[At risk]] with
  **Guard:**; broken gate → [[Failed]] with **Next:**; unverified claim →
  [[Unverified]] with **Check:**; work-kind opener → [[Implement]] /
  [[Investigate]] / [[Preview]] / [[Brainstorm]] / [[Qualify]].
- Ship reports OPEN with a one-line scoreboard (`[[Shipped]] [[Done N]]
  [[Decision N]] [[Skipped N]]` style) under the first line, per
  `agents/registry.md`.
- Files-stay-clean rule (lives in the vocabulary file, cross-referenced from
  docs policy): pills `[[…]]` and Nerd Font glyphs are chat-reply decoration;
  tracked repo files (LOG.md, CHANGELOG.md, templates, plans, archive) stay
  clean markdown — no pill tokens, no icon glyphs.
- pi-workflows does NOT re-teach pill writing — the extension's injected
  guidance owns the vocabulary of how to write pills; this table only maps
  domain tokens onto it.
- `scripts/docs-lint-baseline.json`: additions for the new template file ONLY;
  every existing per-file number stays byte-identical (the ratchet contract).

## Boundaries

### Allowed Changes
- templates/STATUS-VOCABULARY.md
- agents/registry.md
- tests/prompt-doctrine.test.ts
- scripts/docs-lint-baseline.json
- docs/architecture.md
- .workflows/tree.json

### Forbidden
- Modifying or forking the pi-emphasis extension
- Re-teaching pill-writing rules anywhere (the extension owns that guidance)
- Raising any EXISTING per-file baseline number

## Completion Criteria

Scenario: the mapping is single-source and complete
  Test: test_status_vocabulary_mapping_complete
  Given templates/STATUS-VOCABULARY.md
  When the pin reads it
  Then every mapping row from Decision 1 is present (done→Done, queued→Decision, deferred→Pending, closed→Keep, skip→Skipped, P2→At risk, ok:true→Passed)

Scenario: ship reports open with a scoreboard
  Test: test_ship_report_scoreboard_rule
  Given agents/registry.md
  When read
  Then the ship-report doctrine requires the scoreboard line and cites the vocabulary file

Scenario: files stay clean
  Test: test_files_stay_clean_rule
  Given templates/STATUS-VOCABULARY.md
  When read
  Then the rule states pills and glyphs are chat-reply only and tracked files stay clean markdown

Scenario: the ratchet is not gamed
  Test: test_baseline_additions_only
  Given scripts/docs-lint-baseline.json vs HEAD
  When compared
  Then only additions for the new file exist and every pre-existing number is unchanged

Scenario: the tree checker is satisfied
  Test: test_tree_checker_satisfied
  When bash scripts/check-tree.mjs (or the repo's checker entry) runs
  Then it is CLEAN with the new template registered wherever the checker demands

Scenario: gates stay green
  Test: test_gates_stay_green
  When bun test, check-drift and docs-lint run
  Then all exit 0
