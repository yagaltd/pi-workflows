spec: task
name: "tester-role-two-phase-shape-layer2-swap"
tags: []
---

## Intent

Wire tdd-gate into the pi-workflows agent layer as the Layer 2 (test-quality) gate for build tasks: a new `tester` role writes only failing tests first, a two-phase dispatch shape sequences tester → coverage gate → merge → worker+reviewer, the reviewer's Layer 2 becomes `tdd-gate gaming --diff` + `drift --spec`, and tdd-guard is demoted to brownfield (`/fix`, `/refactor`) only. No code changes — this contract governs `agents/*` doctrine files only.

## Decisions

- Tester role: `agents/tester.md` — write-capable, thinking medium; reads the task spec's scenarios, writes ONLY test files carrying the exact `Test:` names, runs the suite, treats RED-for-new-selectors as the success signal, reports the red list + Domain Memory.
- Registry: tester joins the closed set as a registered row (`agents/tester.md`, write: true, model @model:standard, thinking medium).
- Two-phase shape in `agents/dispatch-shapes.md`: Wave A tester → orchestrator coverage gate `tdd-gate coverage --spec .workflows/specs/<task>.spec --tests <dir> --format json` → gaps loop to tester → clean ⇒ merge tester branch → Wave B worker + reviewer stacked (reviewer Layer 2 = `tdd-gate gaming --diff` + `drift --spec` on the worker diff).
- Reviewer: Layer 2 rewritten — tdd-gate gaming + drift for build tasks; tdd-guard cited only as the brownfield tool for `/fix` and `/refactor`.
- Worker: self-verify section no longer cites tdd-guard for build tasks (defers to reviewer Layer 2).
- Quality-reviewer: Check #5 (Jev compliance pre-pass) REPLACED by a contract-relevance check — violations reported only when tied to changed behavior, a relied-upon assumption, or a changed contract; proximity alone never qualifies.
- Doctrine: `agents/execution-doctrine.md` Jev pre-pass section removed; degradation rule added — tdd-gate not installed ⇒ legacy single-worker shape, skip stated loudly, never a silent pass.
- Plan task `tdd:` flag note stays consistent with the shape name (full skills wiring is TASK 3, not this task).

## Boundaries

### Allowed Changes
- agents/tester.md
- agents/registry.md
- agents/worker.md
- agents/reviewer.md
- agents/quality-reviewer.md
- agents/execution-doctrine.md
- agents/dispatch-shapes.md

### Forbidden
- Do not touch `skills/**` (TASK 3 scope), `prompts/**`, `extensions/**`, `tests/**`, README, or CHANGELOG.
- Do not remove any registered role other than adding tester.
- Do not change Layer 1 (agent-spec lifecycle/guard) procedure text.

## Completion Criteria

Scenario: tester role exists and is registered
  Test: test -f agents/tester.md && grep -q "| tester |" agents/registry.md
  Given the agents/ directory after the change
  When the role files and registry table are inspected
  Then agents/tester.md exists
  And the registry row carries write: true, model @model:standard, thinking medium

Scenario: two-phase tdd shape present with exact gate commands
  Test: grep -q "tdd-gate coverage --spec .workflows/specs/<task>.spec --tests <dir> --format json" agents/dispatch-shapes.md && grep -q "tdd-gate gaming --diff" agents/dispatch-shapes.md
  Given agents/dispatch-shapes.md after the change
  When the dispatch shapes are inspected
  Then a `tdd task` shape sequences Wave A tester → coverage gate → Wave B worker + reviewer
  And the reviewer Layer 2 commands `tdd-gate gaming --diff` and `tdd-gate drift --spec` appear in the shape

Scenario: degradation when tdd-gate is missing
  Test: grep -qi "legacy single-worker" agents/execution-doctrine.md && ! grep -qi "Jev pre-pass" agents/execution-doctrine.md
  Given agents/execution-doctrine.md after the change
  When the doctrine is inspected
  Then a degradation rule states that tdd-gate not installed means the legacy single-worker shape with a loudly stated skip
  And no Jev pre-pass section remains

Scenario: reviewer Layer 2 swapped to tdd-gate with brownfield demotion
  Test: grep -q "tdd-gate gaming --diff" agents/reviewer.md && ! grep -q "tdd-guard" agents/reviewer.md
  Given agents/reviewer.md after the change
  When the Layer 2 section is inspected
  Then tdd-gate gaming and drift are the Layer 2 commands for build tasks
  And tdd-guard appears only as the brownfield tool for /fix and /refactor

Scenario: quality-reviewer contract-relevance check replaces Jev pre-pass
  Test: grep -qi "contract-relevance" agents/quality-reviewer.md && ! grep -qi "Jev compliance pre-pass" agents/quality-reviewer.md
  Given agents/quality-reviewer.md after the change
  When Check #5 is inspected
  Then it describes the contract-relevance check with the tied-to-changed-behavior condition
  And no Jev compliance pre-pass text remains

Scenario: worker self-verify defers Layer 2 to reviewer
  Test: ! grep -q "tdd-guard" agents/worker.md
  Given agents/worker.md after the change
  When the self-verify section is inspected
  Then tdd-guard is not cited for build-task verification
  And the worker defers test-quality gating to the reviewer pipeline
