spec: task
name: "readme-canon-lint-pointers"
tags: []
---

## Intent

Point README readers at the new documentation canon and lint script: one line in the Contract Format section linking `docs/canon.md` and `scripts/docs-lint.sh`. Keeps the entry surface coherent with the new docs layer without expanding README scope.

## Decisions

- Single insertion point: the `## Contract Format` section.
- One line, both pointers, no new sections.

## Boundaries

### Allowed Changes
- README.md

### Forbidden
- Do not touch the Commands table (check-drift section 7 validates it).
- Do not touch other sections.

## Completion Criteria

Scenario: README points at canon and lint
  Test: grep -q "docs/canon.md" README.md && grep -q "docs-lint" README.md
  Given README.md after the change
  When the Contract Format section is inspected
  Then it links docs/canon.md and names bash scripts/docs-lint.sh
