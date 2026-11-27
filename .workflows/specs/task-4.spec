spec: task
name: "final-integration-cleanup"
tags: [cleanup, format, gates]
verify: "mise exec -- dprint check --list-different && bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

Close the integration blockers named by TASK 1 and TASK 3: format the repo's declared dprint includes once, repair stale pins and doc wording broken by the new formatter gate, and restore all gates to green without adding behavior or editing release history.

## Decisions

- This is the one explicitly contracted formatting task: `dprint fmt` may run on the declared TS/JS/MJS/JSON includes only.
- Markdown is never formatted; docs-lint stays authoritative and budgets hold or fall.
- Stale pins are updated truthfully to the landed tree: the mise tool-pin hash, the changelog release assertion, and any raw command wording that violates the launcher contract.
- No behavior change, no CHANGELOG edit, no package version edit, no new dependency, and no modification to the dprint plugin set.
- The full pinned suite, dprint check, docs-lint, and check-drift must end green.

## Boundaries

### Allowed Changes
- .workflows/specs/task-4.spec
- ./README.md
- skills/init/SKILL.md
- scripts/**
- tests/**
- extensions/**
- ./package.json
- ./mise.toml
- ./dprint.json
- ./scripts/docs-lint-baseline.json
- ./.workflows/tree.json

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- CHANGELOG.md
- any path outside Allowed Changes

## Completion Criteria

Scenario: declared formatter includes are clean
  Test: test_dprint_includes_clean
  Given the root formatter config
  When the read-only check runs on the full tree
  Then it exits 0 and reports no unformatted file
  And its includes remain TS/JS/MJS/JSON only with no Markdown or process plugin

Scenario: stale pins match landed tree
  Test: test_stale_pins_current
  Given the launcher, release, and tool-pin assertions
  When the full suite runs
  Then the tool-pin hash assertion matches the landed tool manifest
  And the release assertion matches the current release entry without editing release history
  And no raw actionable script invocation appears in skills or prompts

Scenario: docs budgets hold
  Test: test_docs_budgets_hold
  Given the docs-lint baseline and README/init doctrine edits
  When docs-lint and the ratchet tests run
  Then all per-file budgets hold or fall against the pre-task reference
  And the baseline was regenerated only through the docs-lint gate script

Scenario: no behavior or release-history rewrite
  Test: test_no_behavior_or_history_rewrite
  Given the final diff
  When it is inspected
  Then CHANGELOG.md and package version are unchanged
  And no new formatting plugin, dependency, prompt, or verification task was added
  And only Allowed Changes paths were touched

Scenario: all gates green
  Test: test_final_gates_green
  Given the merged cleanup tree
  When the Verify command runs
  Then dprint check exits 0
  And the full suite reports zero failures
  And docs-lint and check-drift exit 0
