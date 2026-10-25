spec: task
name: "skills-flow-wiring-tdd-shape"
tags: []
---

## Intent

Wire the tester two-phase flow (plan 013 D2) into the skills layer. `add-feature` dispatches build tasks through the `tdd task` shape — tester Wave A → `tdd-gate coverage` gate → Wave B worker + reviewer — with the reviewer's Layer 2 (test-quality checks: `tdd-gate gaming --diff` + `tdd-gate drift --spec`) replacing the tdd-guard build-path block. `fix` and `refactor` keep tdd-guard as the brownfield tool and never invoke tdd-gate. `plan` grows the `tdd:` task flag routing build tasks to the tester shape. Docs/doctrine-only: no code changes.

## Decisions

- add-feature: the Phase gate block (currently "Layer 2: Test quality (tdd-guard, if installed)") is replaced by the two-phase flow — tester Wave A per the `tdd task` shape, orchestrator coverage gate, Wave B worker + reviewer with tdd-gate gaming + drift; the completion checklist item tracks the tdd-gate gate instead of tdd-guard.
- fix and refactor: tdd-guard text stays as-is (brownfield, deterministic, offline); no tdd-gate commands or requirements loop are introduced.
- plan: a `tdd:` task flag is documented in the task-table format — build tasks flagged `tdd:` route to the tester shape at /next; the existing spec-drafter rule that scenarios carry explicit `Test:` selectors is restated unchanged.
- No graduation reminders: `@cc` scope is code-local invariants only (CONTRACTS scope line, commit 4b16f58) — the superseded 012 graduation text is not revived here.

## Boundaries

### Allowed Changes
- skills/add-feature/SKILL.md
- skills/fix/SKILL.md
- skills/refactor/SKILL.md
- skills/plan/SKILL.md

### Forbidden
- Do not touch `agents/**` (TASK 2 scope, landed), `prompts/**`, `extensions/**`, `tests/**`, README, CHANGELOG.
- Do not introduce tdd-gate commands into fix/refactor.
- Do not alter the spec-drafter fan-out procedure beyond the `tdd:` flag note.

## Completion Criteria

Scenario: add-feature dispatches build tasks through the two-phase tdd shape
  Test: grep -q "tester" skills/add-feature/SKILL.md && grep -q "tdd-gate coverage" skills/add-feature/SKILL.md
  Given skills/add-feature/SKILL.md after the change
  When the build-phase gate section is inspected
  Then the two-phase flow (tester Wave A → coverage gate → Wave B worker + reviewer) is described with the `tdd task` shape referenced

Scenario: add-feature build path carries no tdd-guard
  Test: ! grep -q "tdd-guard" skills/add-feature/SKILL.md
  Given skills/add-feature/SKILL.md after the change
  When the whole file is searched
  Then zero tdd-guard mentions remain (build-path Layer 2 fully swapped to tdd-gate)

Scenario: fix keeps tdd-guard as brownfield tool
  Test: grep -q "tdd-guard" skills/fix/SKILL.md && ! grep -q "tdd-gate" skills/fix/SKILL.md
  Given skills/fix/SKILL.md after the change
  When the verification sections are inspected
  Then tdd-guard remains the cited test-quality tool
  And no tdd-gate commands appear

Scenario: refactor introduces no tdd-gate
  Test: ! grep -q "tdd-gate" skills/refactor/SKILL.md
  Given skills/refactor/SKILL.md after the change
  When the whole file is searched
  Then no tdd-gate commands appear

Scenario: plan documents the tdd task flag routing to the tester shape
  Test: grep -q "tdd:" skills/plan/SKILL.md && grep -q "tester" skills/plan/SKILL.md
  Given skills/plan/SKILL.md after the change
  When the task-table format section is inspected
  Then a `tdd:` task flag is documented routing flagged build tasks to the tester shape

Scenario: plan spec-drafter Test-selector rule restated
  Test: grep -q "Test:" skills/plan/SKILL.md
  Given skills/plan/SKILL.md after the change
  When the spec-drafter section is inspected
  Then the rule that scenarios carry explicit `Test:` selectors is present
