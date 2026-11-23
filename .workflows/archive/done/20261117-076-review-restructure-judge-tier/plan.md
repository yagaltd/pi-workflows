# Plan — 20261117-076: the review restructure with the judge tier

> Plan ID: 20261117-076 · Status: DONE (shipped v0.15.12 / v0.15.13 / v0.15.14 — Phases 1-3; archived 2026-11-23) · Source: .workflows/scout/20261118-research-typellm-typesafe.md + 20261118-diagnosis-reviewer-73-checks.md (recovered verbatim)

## Intent

The reviewer's 73 checks are prompt accretion (every incident added a check, nothing pruned — the ledger disease, second occurrence). The restructure replaces serial prompt checks with three tiers and builds the decision-model judge tier in:

- **Tier 0 — scripts**: mechanical checks (deterministic, free — the existing gates + /verify). A decision model adds nothing here.
- **Tier 1 — structured first-pass**: Jev forced-choice verdicts on content-fact scenarios (fast, evidence-quoted, confidence-gated: pass/fail/uncertain).
- **Tier 2 — deep judgment**: the reviewer subagent, for uncertain + contradictions + intent.

## Verified facts (recovered + in-repo)

- majordome's `judges.ts` is the working integration ground truth: key from `TYPELLM_API_KEY` env or `~/.config/pi-majordome/typellm.key`; TypeLLM = `POST /v1/generate`, model `typellm-latest`, schema-driven (extraction + DAG decompose + judging with confidence); Jev = typed questions → structured answers + probabilities.
- majordome bench (`EVAL-SLICE*`): typellm 0.95 routing, jev 1.0 in its strong arm.
- Cautions [[Observed]]: confidence-gating mandatory (<0.6 → deep reviewer); DAG extraction needs position-bias control; majordome's D6 metric documented known-broken (fix cribbable); `TYPELLM_API_KEY` stays env-side — the 074 pin (README never contains keys) is in place.
- Loud-skip discipline: no key / unusable response → deep reviewer path, NEVER a silent pass.
- Plan 073 already ships forced-choice sieve at PROPOSAL ENTRY; 074 ships the key pin. 076 adds review-time + ship-time tiers.

## Phased rollout (each phase gated on the previous measurement)

- **Phase 1 (dispatched now — smallest, measurement pattern ready)**: TypeLLM client module (env-side key, schema-driven, loud-skip) + **intake triage at ship** (worker findings classified queued/batched/closed/done) + measurement harness (EVAL-SLICE pattern) + doctrine line in the ship flow.
- **Phase 2 (APPROVED — owner "A" on the Phase-1 numbers: 83.3% intake accuracy, both misses borderline confident-wrong)**: Jev sieve verdicts at review completion (content-fact scenarios; <0.6 confidence → deep reviewer) + **the reviewer.md 73-checks restructure** into the tier map (the accretion fix lands here).
- **Phase 3 (GO — owner redesign 2026-11-18: "DAG + batching is a precision upgrade"; one backend)**: **Batched-DAG review judging, TypeLLM-only** (Jev dropped — one dependency, precision-chosen; seam stays pluggable). (1) BATCH: one call carries ALL scenarios + real file contents within the 32k window (chunk when over) → per-scenario verdicts array — kills the per-scenario call pattern (12–27 calls → 1–2). (2) DAG decompose the REVIEW into dependency-ordered sub-judgments (position-bias controlled — the solved majordome pattern); later verdicts see earlier ones. (3) Uncertainty calibration rides along (penalize confident guesses — the Phase-2 miss class). (4) Harness modes: per-scenario vs batched vs batched-DAG — same fixtures, report accuracy + calls + latency per mode; precision decides the default.

## Phase 1 boundaries

Allowed: extensions/index.ts (+ new src module for the client if cleaner), tests/**, skills/review/SKILL.md (the triage doctrine line), scripts/bench-intake-triage.* (new measurement harness), .workflows/specs. Forbidden: vendor dirs n/a, README key content, agents/reviewer.md (Phase 2), mobile n/a.

## Docs impact

- `agents/reviewer.md` — tier-map restructure (214→160 lines) at Phase 2.
- `docs/architecture.md` — Phase 2 architecture update for the judge seam.
- `skills/review/SKILL.md` — intake triage + verdict + batched-DAG doctrine lines.
- `scripts/bench-intake-triage.ts` — Phase 1 harness + Phase 2 verdict mode + Phase 3 modes.
- CHANGELOG: v0.15.12 / v0.15.13 / v0.15.14 entries (2026-11-18).

## Verification (Phase 1)

RED→GREEN: client unit tests (fake transport, schema validation, loud-skip paths) red first; triage classification table tests; full `bun test` exit 0; `check-drift.sh` CLEAN; `docs-lint.sh` CLEAN (keys never in README); harness reports measured accuracy on fixtures.

## Post-Phase-1 gate

Report measured triage accuracy; owner reviews; Phase 2 planned on the numbers.
