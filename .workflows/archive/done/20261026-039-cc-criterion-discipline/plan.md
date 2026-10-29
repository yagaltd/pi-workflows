# Plan: cc-contract criterion + seam-only discipline (039)

> Plan ID: 20261026-039 ✅
> Status: SHIPPED 2026-10-29 — v0.12.5 (final gate review-final ok:true, first pass)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1 (inline); T2 W2 (inline). Docs-only — no code changes, no dispatches.

## Context

@cc today: 12 directives, all seams in `extensions/index.ts`, placed at write time; `cc-check format` in the gate chain; the doc-drift gate parses `adr:`-attributed @cc contracts; ADRs live in `.workflows/decisions/DEC-001..005` (INDEX + `decisions.mjs check`). Plan 012 rejected @cc requirements graduation (code-local invariants only). The 2026-10-26 cc-adoption discussion (owner): tree sweep REJECTED; greenfield criterion ADOPTED; seam-only discipline KEPT. This plan writes the adopted parts down.

## Decisions

- **D1 — contract criterion line.** `templates/CONTRACT-FORMAT.md` gains one rule: when a spec Decision states a code-local invariant, the task contract adds a criterion — the worker places `@cc [label:<seam>,adr:DEC-xxx] <constraint>` at the implementation point. Placement is an implementation artifact, not a completion criterion. Never per-file, never folder-tree.
- **D2 — seam-only discipline.** `docs/canon.md` Rules gains one bullet: @cc placement is (a) at new seams at write time and (b) by drift — a caught invariant earns its @cc. @cc states the constraint in code-local terms + `adr:` reference; it never restates ADR rationale or spec criteria; tree-wide sweeps are rejected (plan 012 + the 2026-10-26 assessment).
- **D3 — enforcement unchanged.** `cc-check format` stays in the gate chain as-is. No new tooling, no code changes.
- **D4 — version 0.12.5** at SHIP (docs-only).

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 criterion line + discipline doc | task-1.spec | 1 | orchestrator-inline Tier A |
| T2 CHANGELOG + version | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier A, ⚪): docs edits — templates/CONTRACT-FORMAT.md, docs/canon.md — orchestrator-inline ✅ ✅
- D1 one criterion rule in the contract template (Placement section, after the criterion guidance); D2 one Rules bullet in canon.md (cross-ref DEC index + plan-012). Verbatim-minimal edits.

### TASK 2 (Tier A, ⚪): ship prep — orchestrator-inline ✅ ✅
- CHANGELOG v0.12.5 (docs-only entry), version bump, full gate chain (bun unchanged 225/0, drift CLEAN, docs-lint, cc-check known-finding only).

## Adversarial pass (on record)

- Criterion line vs Completion Criteria duplication → D1 pins the distinction: the contract MAY carry a placement criterion; the @cc text itself never restates the spec's criteria (canon bullet).
- Sweep temptation returns → D2 records the rejection with its reasons (plan-012 + this plan), so a future plan must overturn the record, not silently sweep.
- canon.md carries a `stale_after` header (2026-11-24) → the edit refreshes `generated_at`/`stale_after` per the doc-lint rules.

## Verification (whole-plan final gate)

CONTRACT-FORMAT carries the criterion rule (grep) · canon.md carries the discipline bullet (grep) · bun 225/0 unchanged · drift CLEAN · docs-lint exit 0 · cc-check known-finding only · version 0.12.5 · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern).
