spec: task
name: "cc-check list rides dispatch packs"
tags: [dispatch-shapes, cc-check, adr-slices]
max-rounds: 2
verify: grep -q "cc-check list" agents/dispatch-shapes.md && grep -q "never rely on" agents/dispatch-shapes.md
---

## Intent

Replace the hand-written ADR-slices dispatch-pack rule with mechanically exact `cc-check list` output for the task's files. The one-line hand summary survives only as a fallback when a governing ADR exists but no `adr:`-attributed contract covers the seam yet — the documented burned-round failure class gets a structural fix, not a second mechanism.

## Decisions

- The dispatch context pack carries `cc-check list` output (file- or location-scoped) for each Allowed-Changes file that has applicable contracts.
- The hand-written one-line ADR slice is **fallback ONLY** — used when a governing ADR exists but no `adr:`-attributed contract covers the seam; never a parallel primary path.
- When cc-check is absent or the repo has no contracts: existing ADR-slice behavior unchanged.
- The existing "never rely on 'read CONTEXT.md'" rule stays, verbatim.

## Boundaries

### Allowed Changes
- agents/dispatch-shapes.md

### Forbidden
- everything else, incl. agents/reviewer.md, agents/worker.md, agents/registry.md, templates/, skills/, extensions/

## Completion Criteria

Scenario: list output rides the pack
  Test: grep -q "cc-check list" agents/dispatch-shapes.md
  Given the dispatch-shapes documentation
  When the edit lands
  Then the pack-construction rules state that cc-check list output for the task's files rides the pack

Scenario: ADR slices marked fallback-only
  Test: grep -B3 -A10 "ADR slices" agents/dispatch-shapes.md | grep -qi "fallback"
  Given the existing ADR-slices rule (lines ~173–178)
  When the edit lands
  Then the hand-written slice is explicitly labeled a fallback used only when no adr:-attributed contract covers the seam

Scenario: never-rely line preserved
  Test: grep -q "never rely on" agents/dispatch-shapes.md
  Given the pre-existing rule text
  When the edit lands
  Then the "never rely on 'read CONTEXT.md'" rule is still present verbatim

Scenario: Negative — no parallel primary mechanism
  Test: bash -c '! grep -A12 "ADR slices" agents/dispatch-shapes.md | grep -qi "primary"'
  Given the rewritten section
  When read as a whole
  Then the hand-slice is nowhere presented as the primary mechanism — cc-check list is
