spec: task
name: "worker rule — @cc on new/changed public seams"
tags: [worker, cc-check, seams]
max-rounds: 2
verify: grep -q "@cc" agents/worker.md && grep -q "Applicable contracts" agents/worker.md
---

## Intent

Add the seams rule to the worker role: public functions/classes created or changed within Allowed Changes carry `@cc` code-contract comments for their durable invariants, with the extensible `adr:` attribute when a governing ADR exists. Durable invariants only — per-task ephemera stays in `.spec`.

## Decisions

- Scope: public seams (exported functions, classes, methods) created or CHANGED within the task's Allowed Changes — not every function.
- One `@cc` directive per invariant, stable kebab-case ID, `label:` attribute for area, optional `adr:` attribute naming the governing ADR number when one exists.
- Durable invariants only; behavior that dies with the task belongs in the `.spec` (this division is the point — state it).
- The rule cross-references the spec's `## Applicable contracts` section title (created by the sibling task touching CONTRACT-FORMAT.md) so workers read pack contracts at dispatch time.
- No changes to the blocker protocol, Domain Memory section, or verification steps.

## Boundaries

### Allowed Changes
- agents/worker.md

### Forbidden
- everything else, incl. agents/reviewer.md, agents/dispatch-shapes.md, templates/, skills/, extensions/, tests/

## Completion Criteria

Scenario: Seams rule present with example
  Test: grep -q "@cc" agents/worker.md
  Given agents/worker.md at HEAD
  When the edit lands
  Then a seams rule exists with at least one concrete @cc example directive showing directive syntax with a label: attribute

Scenario: adr attribute documented
  Test: grep -q "adr:" agents/worker.md
  Given the new rule
  When a governing ADR exists for the seam
  Then the worker adds the adr: attribute naming it — the rule says so with the attribute spelled out

Scenario: Durable-not-ephemera division stated
  Test: grep -B2 -A8 "@cc" agents/worker.md | grep -qi "invariant"
  Given the new rule
  When read
  Then it explicitly separates durable invariants (@cc) from per-task ephemera (.spec Completion Criteria) — no blurring

Scenario: Cross-reference to spec section
  Test: grep -q "Applicable contracts" agents/worker.md
  Given the sibling task creates ## Applicable contracts in CONTRACT-FORMAT.md
  When the worker reads its spec
  Then the worker.md rule points at that section by its exact title

Scenario: Negative — Domain Memory section untouched
  Test: grep -q "Domain Memory (mandatory" agents/worker.md
  Given the mandatory reporting section
  When the edit lands
  Then the Domain Memory section header and mandate remain intact, byte-identical in intent
