# Plan: plan-thinner — SKILL as sole flow authority (037)

> Plan ID: 20261026-037
> Status: SHIPPED 2026-10-26 — v0.12.3 (final gate review-final ok:true)
> Created: 2026-10-26
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1 (dispatch); T2 W2 (inline).

## Context

`/plan` carries the same mirror-divergence class plan 036 fixed for `/next`: `prompts/plan.md` (135 lines) mirrors phases of `skills/plan/SKILL.md` (487 lines), and two governance additions landed PROMPT-ONLY — the judge pre-flight wiring (plan 20261025-017 T2) and the PROPOSAL-FORMAT draft-guidance pointer (plan 20261025-018 T2) — while the SKILL kept its own older Phase 5 text. The prompt↔SKILL pair can now disagree, and the large prompt is the residual bloat the audit flagged (135 lines for a command whose real flow is the SKILL).

## Decisions

- **D1 — SKILL becomes the sole flow authority.** The prompt-unique content MOVES into `skills/plan/SKILL.md`: (a) the judge pre-flight steps (currently a Phase 5 addendum in the prompt) merge into the SKILL's Phase 5 section verbatim-in-meaning; (b) the PROPOSAL-FORMAT draft-guidance pointer merges into the SKILL's proposal-drafting step. After the move, the SKILL is the only place the /plan flow exists.
- **D2 — Thin prompt.** `prompts/plan.md` rewrites to: frontmatter (`description` only), the draft-guidance pointer (one line, PROPOSAL-FORMAT), and "load `skills/plan/SKILL.md` and execute it". Target ≤ 25 lines. No flow prose.
- **D3 — No behavior change.** The /plan flow's steps, order, and gates are identical before/after — only their HOME moves. `bun test` count unchanged; drift sections 1/4/5/7 keep passing (SKILL refs resolve, template refs resolve).
- **D4 — Version 0.12.3** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 move prompt-unique flow into the SKILL + thin prompt | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 docs + ship prep | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): SKILL authority + thin prompt — skills/plan/SKILL.md, prompts/plan.md ✅
- D1 move + D2 rewrite. Contract greps: the SKILL carries the judge pre-flight (judge.mjs ask, JUDGE SKIPPED, audit location) + the PROPOSAL-FORMAT pointer; the prompt ≤ 25 lines with the pointer and no phase-flow prose; bun/drift unchanged.

### TASK 2 (Tier A, ⚪): docs + ship — orchestrator-inline
- CHANGELOG v0.12.3, version bump, full gate chain.

## Adversarial pass (on record)

- The move must not lose the prompt-only additions → contract greps pin them IN THE SKILL before the prompt shrinks (move-first, shrink-second order inside T1).
- SKILL growth (487 → ~500) is accepted — the SKILL is the authority; the prompt is the trigger.
- pi loads prompts as commands and skills on demand — a thin prompt that says "load the SKILL" matches the established house pattern (brainstorm, idea).

## Verification (whole-plan final gate)

SKILL carries the moved sections (grep) · prompt ≤ 25 lines with the pointer (grep) · drift CLEAN · bun green (count unchanged) · docs-lint exit 0 · cc-check known-finding only · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern).
