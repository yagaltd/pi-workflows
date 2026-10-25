spec: task
name: "proposal-format-template"
tags: []
---

## Intent

Add `templates/PROPOSAL-FORMAT.md` (backlog item 6, proposal-template half): the house format for plan proposals gains two mandatory sections — Refactor assessment (overlap scan result + verdict enum `clean-slate | extend | refactor-first`; overlap discovered mid-plan ⇒ block to human) and Docs impact (declared doc paths + CHANGELOG entry). `prompts/plan.md` references the template at draft time.

## Decisions

- Template sections: `## Refactor assessment` (overlap scan + the three-value verdict + block-to-human rule) and `## Docs impact` (declared doc paths list + CHANGELOG entry line). A proposal missing either section fails review.
- TASK 4 of plan 20261025-018 consumes the Docs impact section: `scripts/check-archive.sh` reads the declared paths from the shipped plan and verifies them.
- `prompts/plan.md` gains one pointer line in its draft guidance: proposals follow `templates/PROPOSAL-FORMAT.md`.

## Boundaries

### Allowed Changes
- templates/PROPOSAL-FORMAT.md
- prompts/plan.md

### Forbidden
- Do not touch `scripts/**` (TASK 3 scope), `skills/**`, `docs/**` (TASK 4 scope), README, CHANGELOG.
- Do not alter the CONTRACT-FORMAT template.

## Completion Criteria

Scenario: template carries the two mandatory sections
  Test: grep -q "Refactor assessment" templates/PROPOSAL-FORMAT.md && grep -q "Docs impact" templates/PROPOSAL-FORMAT.md
  Given templates/PROPOSAL-FORMAT.md after the change
  When its sections are inspected
  Then both mandatory sections exist with their rules

Scenario: verdict enum documented
  Test: grep -q "clean-slate" templates/PROPOSAL-FORMAT.md && grep -q "refactor-first" templates/PROPOSAL-FORMAT.md
  Given the Refactor assessment section
  When the verdict enum is inspected
  Then clean-slate, extend, and refactor-first are documented with the block-to-human rule

Scenario: plan prompt references the template
  Test: grep -q "PROPOSAL-FORMAT" prompts/plan.md
  Given prompts/plan.md after the change
  When the draft guidance is inspected
  Then it names templates/PROPOSAL-FORMAT.md as the proposal format
