spec: task
name: "Registry + dispatch shapes — tier routing + spec-drafter role"
tags: [registry, tiers, spec-drafter, dispatch-shapes]
max-rounds: 2
---

## Intent

Wire tiers and the spec-drafter into the dispatch policy single-source-of-truth: the bottleneck
table routes by tier, the Roles table gains its fifth role, and dispatch-shapes gains the two
delegation templates the drafting pipeline needs.

## Decisions

- D1+D2 wiring (plan 20260822-005) into `agents/registry.md` + `agents/dispatch-shapes.md`.
  v0.5.2 rules are LOAD-BEARING: every `@model:<role>` ref stays; raw ids stay only as marked
  fallback constants; bash-non-optional reviewer note stays.
- **registry.md edits**:
  1. Bottleneck table gains a **Tier column** — map: 🔴→C or B (per plan), 🟡→B, 🔵→B, 🟠→B,
     ⚪→A or B, scout→A. Tier refines routing: A → `@model:standard` + thinking low + grep-only
     review (`Verify:` line) or orchestrator-inline; B → existing per-tag routing unchanged;
     C → `@model:strong` + high + serial, never parallel.
  2. New subsection **"Task tiers (routing overlay)"** after the model+thinking table: tier is
     decided at plan time (adversarial pass), written next to each task in plan.md, and refines
     (never overrides the existence of) reviewer verdicts — every tier still requires a verdict
     for ✅ (doctrine #7).
  3. Roles table gains row: `spec-drafter | agents/spec-drafter.md | write:true,
     contract-limited to .workflows/specs/** | @model:standard | high`.
- **dispatch-shapes.md gains two shapes**:
  1. `## Spec drafting fan-out (one call, graph mode)` — N spec-drafter tasks in one `tasks[]`
     array; each task text carries: repo GUARD line, the decision VERBATIM, the scout-fact
     slices (pasted inline), boundaries, the exact spec filename to write; orchestrator reviews
     each landed spec mechanically after the fan-out (needs-edge to a single review task or
     orchestrator-side — document orchestrator-side as default).
  2. `## Plan draft delegation (single task)` — one `@model:strong` thinking-high task receiving
     scout facts + user goal + plan format; output = plan draft to `.workflows/plan-draft-<id>.md`;
     never dispatched without the adversarial pass; never writes specs.

## Boundaries

### Allowed Changes
- agents/registry.md
- agents/dispatch-shapes.md

### Forbidden
- Everything else — agents/reviewer.md, agents/worker.md, agents/spec-drafter.md (T4's),
  agents/execution-doctrine.md (T1's), skills/**, README.md, .workflows/**, scripts/**, tests/**

## Completion Criteria

Scenario: Tier column lands without breaking refs
  Test: grep -c "@model:" agents/registry.md && grep -ci "tier" agents/registry.md
  Then ≥13 @model: refs preserved (v0.5.2 baseline); ≥8 tier mentions incl. column header

Scenario: Routing overlay subsection present
  Test: grep -n "routing overlay" agents/registry.md && grep -c "orchestrator-inline" agents/registry.md
  Then subsection exists; inline + grep-only-review + serial-C rules greppable; "every tier still requires a verdict" present

Scenario: spec-drafter role row registered
  Test: grep -n "spec-drafter" agents/registry.md
  Then Roles table row with prompt file, toolset note, @model:standard, thinking high

Scenario: Two new dispatch shapes
  Test: grep -n "^## Spec drafting fan-out\|^## Plan draft delegation" agents/dispatch-shapes.md
  Then both shapes present, each with a code-block template + GUARD line + the input contract (decision verbatim / scout facts)

Scenario: v0.5.2 invariants hold
  Test: grep -c "bash non-optional" agents/registry.md && grep -n "fallback constant" agents/registry.md | wc -l
  Then reviewer bash note intact; raw ids still only under fallback-constant markers

Scenario: Scope contained
  Test: git status --porcelain
  Then only agents/registry.md + agents/dispatch-shapes.md changed (tracked files)
