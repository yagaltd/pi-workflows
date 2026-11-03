spec: task
name: prompt-doctrine-role-files
tags: [doctrine, prompts, tdd]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

agents/worker.md and agents/reviewer.md gain the three stolen doctrine lines (DSH/Bise): call budgets, done-when acceptance phrasing, cite-or-open-questions. TDD: tests/prompt-doctrine.test.ts pins the lines first (RED), then the edits.

## Decisions

- Budget line (worker): "Budget: at most 60 tool calls on standard tasks; judge/API-call caps are set per contract — when any budget is spent, report and stop, naming the spent line item."
- Budget line (reviewer): same shape, reviewer-scoped.
- Done-when (worker): "Every pack carries a 'Done when:' acceptance checklist derived from the contract's verify command and completion criteria; the final report asserts each line individually."
- Cite-or-open-questions (both): "Doc- or claim-producing tasks: every factual claim cites file:line or a URL, or lands in an 'Open questions' section of the final report. An uncited, unflagged claim is a defect."
- Additive sections only — role-file header shapes stay parser-clean (extension.test.ts roleBody tests must stay green).

## Boundaries

### Allowed Changes
- agents/worker.md
- agents/reviewer.md
- tests/prompt-doctrine.test.ts (new)

### Forbidden
- Do not modify prompts/, agents/registry.md, agents/execution-doctrine.md, templates/, AGENTS.md
- Do not change role-file headers or frontmatter shapes

## Completion Criteria

Scenario: budget doctrine present in both role files
  Test: budget line is pinned verbatim in worker and reviewer role files
  Given both role files after the edit
  When the pin test reads them
  Then each contains the budget line (60-call default + spent-report rule)

Scenario: done-when doctrine pinned
  Test: done-when checklist line is pinned verbatim in the worker role file
  Given agents/worker.md
  When the pin test reads it
  Then it contains the Done-when acceptance-checklist rule

Scenario: cite-or-open-questions pinned in both
  Test: cite-or-open-questions line is pinned verbatim in worker and reviewer role files
  Given both role files
  When the pin test reads them
  Then each contains the cite-or-open-questions rule

Scenario: role parser shapes stay clean
  Test: real role file shapes stay clean \(all four files\)
  Given the edited role files
  When extension.test.ts runs
  Then all roleBody tests pass unchanged
