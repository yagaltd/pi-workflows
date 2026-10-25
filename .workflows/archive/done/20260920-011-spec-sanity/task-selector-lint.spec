spec: task
name: "Layer A — mechanical selector syntax check"
tags: [phase5, selector-lint, mechanical]
max-rounds: 2
verify: bash scripts/check-spec-selectors.sh tests/fixtures/bad-selectors.spec; [ $? -eq 1 ] && bash scripts/check-spec-selectors.sh tests/fixtures/good-selectors.spec
---

## Intent

`scripts/check-spec-selectors.sh` — a parse-only lint for `.spec` `Test:` selectors: `bash -n` every shell selector, sanity-check grep-family flags; exit 1 with `file:line: finding` output on defects, 0 when clean. Wired into plan Phase 5 after agent-spec parse (findings fix-or-justify before the approval gate). Fixture-tested.

## Decisions

- PARSE-ONLY: `bash -n <file>` on extracted selectors; the script NEVER executes selector text (selectors describe post-work end state — execution is meaningless pre-work and dangerous).
- Grep-flag sanity: `-A/-B/-C/-c` values must be numeric; pattern argument non-empty; a path argument present when the selector references one.
- Output: one `file:line: <finding>` per defect to stdout, exit 1; silent exit 0 when clean (house style: quiet when green).
- Accepts spec paths as args; with no args, lints `.workflows/specs/*.spec` if present (absent dir = clean exit 0, no error).
- Placement: plan SKILL.md Phase 5 — after agent-spec parse, before the human approval gate; findings are fix-or-justify, never silently ignored.
- Fixtures: `tests/fixtures/good-selectors.spec` (passes) and `tests/fixtures/bad-selectors.spec` (contains ≥3 distinct defect classes: shell syntax error, non-numeric grep flag, empty pattern).

## Boundaries

### Allowed Changes
- scripts/check-spec-selectors.sh
- tests/fixtures/good-selectors.spec
- tests/fixtures/bad-selectors.spec
- tests/spec-selectors.test.ts
- skills/plan/SKILL.md

### Forbidden
- everything else, incl. agents/, templates/, prompts/, extensions/, models/, other scripts/, other tests/

## Completion Criteria

Scenario: Good spec passes clean
  Test: bash scripts/check-spec-selectors.sh tests/fixtures/good-selectors.spec
  Given the good fixture (valid selectors incl. a legit grep -A6 and a bash -c-free compound test)
  When the lint runs
  Then exit 0 with no output

Scenario: Bad spec caught with file:line findings
  Test: bash scripts/check-spec-selectors.sh tests/fixtures/bad-selectors.spec > /tmp/lint.out; [ $? -eq 1 ] && grep -c ': ' /tmp/lint.out
  Given the bad fixture carries >=3 defect classes
  When the lint runs
  Then exit 1 and every finding line is file:line prefixed (count >= 3)

Scenario: Suite covers both directions
  Test: bun test tests/spec-selectors.test.ts
  Given the test file
  When bun test runs
  Then good-fixture rc0 and bad-fixture rc1-with-findings are both asserted

Scenario: Phase 5 wiring present
  Test: grep -q "check-spec-selectors" skills/plan/SKILL.md
  Given plan SKILL.md Phase 5 text
  When the edit lands
  Then the lint step appears after agent-spec parse with fix-or-justify wording

Scenario: Negative — parse-only, never executes selectors
  Test: bash -c '! grep -E "bash +\\"|eval |sh +-[ce] " scripts/check-spec-selectors.sh'
  Given the script
  When inspected
  Then no construct executes extracted selector text — bash -n is the only bash invocation form used on it
