# Plan: mechanical diagram generators (20261104-057)

> Plan ID: 20261104-057
> Status: DONE — shipped as v0.14.13 on 2026-11-04; retro-archived 2026-11-17 by plan 20261117-064 (TASK 2)
> Created: 2026-11-04
> Reconstructed: 2026-11-17 — the original plan text is lost (see below)

## Reconstruction note (read first)

**The original `.workflows/plan.md` text for this plan is lost.** Plans 055–063 shared the
single live plan file; each plan overwrote it, and every one of them shipped before the SHIP
archive step was in force — so no bundle was ever written.

Nothing in this file was invented after the fact. It carries the surviving sources verbatim:

- **CHANGELOG.md** — the shipped entry `v0.14.13: mechanical diagram generators` (CHANGELOG.md:42)
- **.workflows/LOG.md** — every line naming this plan id (LOG.md:326, LOG.md:327, LOG.md:329)
- **.workflows/reviews/plan-057.md** — the review verdict, copied into this bundle as `reviews/plan-057.md`
  and reproduced verbatim below

Unrecoverable by construction, and therefore absent rather than guessed: the task decomposition,
the `specs/` contracts, the Execution Notes, and the per-task verdicts — all of them lived in the
overwritten plan file and its spec dir.

## CHANGELOG entry (verbatim)

```
## 2026-11-04 — v0.14.13: mechanical diagram generators (plan 20261104-057)

- **scripts/plan-diagram.mjs**: .workflows/plan.md + specs/*.spec → SeeCode flowchart JSON (deterministic, ≤9-node/≤12-edge budget split, sub-labels from Intent clauses; canonical `N. **name**` and `### TASK N` plan styles) — diagrams/pi-workflows.json is now generator output, never hand-authored.
- **scripts/ship-diagram.mjs**: git diff --name-status → A/M/R/D classification + markdown ship report (files by kind, CHANGELOG features, verdict criticality — deterministic only) + SeeCode bar JSON. CLI: --from <tag|ref> --to <ref> [--diff-file].
- Diagram tooling: upstream diagram-design (cathrynlavery) installed as the editorial skill; SeeCode retained as the mechanical renderer engine (the JSON-spec model is the fork's invention — upstream is agent-authored HTML).
- Version tags introduced: v0.14.10–v0.14.13 (ship-diagram anchors). 16 new tests; suite 352 pass / 0 fail; verdict reviews/plan-057.md ok:true (Tier A inline).
```

## LOG lines (verbatim)

```
- 20261104 plans 056 (idea ledger + TypeLLM triage) + 057 (diagram-design upstream swap + mechanical plan/ship generators) DRAFTED — .workflows/proposals/plan-056.md, plan-057.md, awaiting owner approval. Research pinned: SeeCode = stale fork of cathrynlavery/diagram-design (upstream has architecture-delta type natively); judge.mjs = systemone-only single client (triage rides native typellm_judge instead); exact triage call shape (extract→classify→refine via when-gated levels + stacking_risk) in proposal.
- 20261104 plan-057 T0 executed (inline, machine): upstream diagram-design installed as pi package source "../../Documents/vibe/diagram-design" (pi list confirms; SeeCode kept). MATERIAL CORRECTION pinned: upstream has NO JSON renderer (agent hand-writes HTML per taste gates; imports extract digests) — the JSON-spec + seecode.mjs renderer is the FORK's invention. Verdict revised: SeeCode = mechanical engine (generators target its JSON format, verified renderer on disk); upstream = editorial complement. Owner intent (mechanical, no-drift diagrams) preserved; no format migration needed.
- 20261104 plan 057 CLOSED: verdict ok:true (reviews/plan-057.md, Tier A inline); SHIP v0.14.13 (owner-approved, standing push auth). Both generators landed TDD (9+7 pins); tags v0.14.10-13 introduced. Convention: plan Tasks sections use `N. **name** (worker)` canonical format so plan-diagram regeneration works; editorial diagrams via upstream diagram-design on request.
```

## Review verdict (verbatim)

```
# Review — plan 20261104-057 (diagram tooling + mechanical generators)

- Verdict: **ok: true** (orchestrator-inline, registry Tier A — script micro-plan, workers TDD RED→GREEN ×2)
- Workers: pw60-plan-diagram + pw60-ship-diagram (run_mw1upra7_i7bbtp/task_1,2); merged 5d678af, fc3ec5d
- T0 (inline, machine): upstream diagram-design installed (pi package source, pi list verified); MATERIAL CORRECTION pinned in LOG — upstream has NO JSON renderer (agent-authored HTML per taste gates); the JSON+renderer model is the SeeCode fork's invention → SeeCode retained as the mechanical engine, upstream = editorial complement
- Transport verified on main: scripts/plan-diagram.mjs (plan.md+specs → SeeCode flowchart JSON, ≤9/12 budget split, canonical + ### TASK styles) + tests 9/9; scripts/ship-diagram.mjs (A/M/R/D classification, markdown report, CHANGELOG features, verdict criticality parse, bar JSON) + tests 7/7; suite 352 pass / 0 fail; drift CLEAN; live render {"ok":true,"type":"flowchart"}; SeeCode render of ship bar JSON {"ok":true}
- Known behavior (correct): regeneration exits 2 on non-canonical Tasks formats (plan-056 prose bullets) — future plans use `N. **name** (worker)`; placeholder diagram from archive-049 renders until the next canonical plan
- Tooling note: repo had no tags — v0.14.10/11/12 tagged retroactively at this ship; ship-diagram --from accepts commit refs or tags
```

## Docs impact

Reconstructed at retro-archive time — the original declaration was lost with the plan text. These are the doc paths the surviving evidence shows this ship updated.

- `CHANGELOG.md` — the v0.14.13 entry above, appended at SHIP.
