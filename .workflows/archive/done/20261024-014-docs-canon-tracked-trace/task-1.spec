spec: task
name: "gitignore-split-tracked-trace"
tags: []
---

## Intent

Split `.workflows/` in `.gitignore` so the durable decision evidence — LOG.md, CONTEXT.md, reviews/, archive/, proposals/ — becomes tracked, while live state (plan.md), in-flight contracts (specs/), and scratch (scout/, spikes/) stay ignored. Git then carries the repository's decision history.

## Decisions

- Replace the `.workflows/` ignore line with `.workflows/*` (parent-dir form) plus negations: `!.workflows/LOG.md`, `!.workflows/CONTEXT.md`, `!.workflows/proposals/`, `!.workflows/reviews/`, `!.workflows/archive/`. Negations under a fully excluded directory never match, so the parent-dir form is mandatory.
- `plan.md`, `specs/`, `scout/`, `spikes/` stay ignored — live state and scratch are ephemeral.
- The orchestrator `git add`s the durable set in the same change; no history rewrite of previously ignored material.

## Boundaries

### Allowed Changes
- .gitignore

### Forbidden
- Do not edit any `.workflows/` content in this task.
- Do not track plan.md, specs/, scout/, or spikes/.

## Completion Criteria

Scenario: durable set is tracked
  Test: git ls-files --error-unmatch .workflows/LOG.md .workflows/CONTEXT.md >/dev/null && git ls-files .workflows/archive/ | grep -q . && git ls-files .workflows/proposals/ | grep -q . && git ls-files .workflows/reviews/ | grep -q .
  Given the committed tree after the change
  When git ls-files is consulted
  Then LOG.md and CONTEXT.md are tracked
  And archive/, proposals/, and reviews/ contain tracked files

Scenario: ephemeral paths stay ignored
  Test: git check-ignore -q .workflows/plan.md .workflows/specs/x.spec .workflows/scout .workflows/spikes
  Given the new .gitignore
  When check-ignore evaluates live state, in-flight specs, and scratch dirs
  Then every path is reported ignored

Scenario: ignore file uses the splittable parent-dir form
  Test: grep -q "^\.workflows/\*$" .gitignore && ! grep -q "^\.workflows/$" .gitignore
  Given the committed .gitignore
  When its lines are inspected
  Then the `.workflows/*` form is present and the blanket `.workflows/` form is gone
