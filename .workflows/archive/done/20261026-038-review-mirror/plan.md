# Plan: review-mirror — /review SKILL extraction (038)

> Plan ID: 20261026-038
> Status: SHIPPED 2026-10-26 — v0.12.4 (final gate review-final ok:true, first pass on the landed state)
> Created: 2026-10-26
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1 (dispatch); T2 W2 (inline).

## Context

`/review` is the last oversized command: `prompts/review.md` = 195 lines carrying the full review flow (Stage 0 risk-scoping → Stage 1 mechanical → Stage 2 adversarial+quality → Stage 3 SHIP with the check-archive gate → Combined Output) — and no SKILL (`skills/review/` does not exist; every other major command has one). The thin-entry pattern (036: `/next` 103→45; 037: `/plan` 135→7) applies: extract the flow into `skills/review/SKILL.md`, leave the prompt as a thin entry.

## Decisions

- **D1 — SKILL extraction.** `skills/review/SKILL.md` (new) carries the full flow verbatim-in-meaning: Stage 0 scope (fast/full path rules), Stage 1 mechanical verification, Stage 2 adversarial + quality review, Stage 3 SHIP (incl. the `check-archive.sh` gate line), Combined Output format. The SKILL is the sole authority — no prompt↔SKILL mirror.
- **D2 — thin prompt.** `prompts/review.md` rewrites to ≤ 30 lines: frontmatter (`description` only), role statement (mechanical verifier discipline applies to whatever the SKILL dispatches), and "load `skills/review/SKILL.md` and execute it". No stage prose.
- **D3 — no behavior change.** Stages, order, gates, and the check-archive wiring identical; only the home moves. bun test count unchanged; drift sections 3b (SKILL references resolve), 4/5/7 keep passing.
- **D4 — version 0.12.4** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 SKILL extraction + thin prompt | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 docs + ship prep | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): SKILL extraction + thin prompt — skills/review/SKILL.md, prompts/review.md ✅
- D1 extract + D2 rewrite. Contract greps: the SKILL carries Stage 0–3 + check-archive; the prompt ≤ 30 lines, pointer + load-and-execute, no stage prose; bun/drift unchanged.
- AMENDMENT A (orchestrator, on record in LOG): Allowed extended to the 5 wiring-test re-points (chooser/closeout/decisions-docs/lessons-docs/ship-wiring → read skills/review/SKILL.md).

### TASK 2 (Tier A, ⚪): docs + ship prep — orchestrator-inline
- README `/review` row mechanism note, CHANGELOG v0.12.4, version bump, full gate chain.

## Adversarial pass (on record)

- The SKILL is new (no mirror to diverge) — one-time extraction, no move-first ordering needed.
- check-drift section 3b: the new SKILL's references/ modules (if any) must resolve — keep the extraction self-contained (no new references/ dirs).
- README `/review` row stays (drift section 7) — only its description may gain the mechanism note (T2).
- The SHIP wiring (check-archive) moves with Stage 3 — zero behavior change.

## Verification (whole-plan final gate)

SKILL carries Stage 0–3 + check-archive (grep) · prompt ≤ 30 lines, no stage prose (grep + wc) · drift CLEAN · bun green (count unchanged) · docs-lint exit 0 · cc-check known-finding only · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern).
