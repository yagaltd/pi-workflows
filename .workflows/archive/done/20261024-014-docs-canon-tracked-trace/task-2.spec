spec: task
name: "docs-canon"
tags: []
---

## Intent

Create `docs/canon.md` — the repository's documentation standard, adapted from lore-style documentation engineering: typed docs mapped to Diátaxis, freshness stamps for generated documents, origin notes for adopted ideas, and the rule that every behavioral claim names its gate. One file, no behavior change.

## Decisions

- One canon file at `docs/canon.md`; no other docs structure is created in this task.
- Doc types mapped to Diátaxis: README = reference entry; AGENTS.md = charter; `skills/` + `prompts/` = procedures (how-to); `docs/**` = development guides (how-to/reference/explanation); `.workflows/archive/` = decision records.
- Generated documents carry `generated_by` + `generated_at` + `stale_after` stamps.
- Adopted ideas use this repository's own names; origin tools appear only as reference notes.
- Every behavioral claim names its gate — the check that proves it.

## Boundaries

### Allowed Changes
- docs/canon.md

### Forbidden
- Do not create any other file under `docs/`.
- Do not modify README.md or AGENTS.md (TASK 5 scope).

## Completion Criteria

Scenario: canon file exists with the required sections
  Test: test -f docs/canon.md && grep -q "Diátaxis" docs/canon.md && grep -q "generated_by" docs/canon.md && grep -qi "origin" docs/canon.md && grep -qi "gate" docs/canon.md
  Given docs/canon.md after the change
  When its content is inspected
  Then it defines the doc types with the Diátaxis mapping
  And it states the stamp keys generated_by, generated_at, stale_after
  And it states the origin-note rule and the claim-names-its-gate rule
