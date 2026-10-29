# Plan: metric gates — mechanical quality thresholds (044)

> Plan ID: 20261026-044
> Status: SHIPPED 2026-10-29 — v0.13.0 (final gate ok:true, zero findings)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2 inline.

## Context

The generator study's last item (origin: ub-mode companion tools — crapper/dryer/mutator; adopted under our names: complexity gate, duplication gate, mutation gate). Language fit verified 2026-10-29: TypeScript and Rust covered. The thresholds: complexity CRAP < 10 per function; duplication similarity < 0.8; mutation: kill survivors (score = killed / (killed + survived)). The tools are Clojure-based CLIs writing snapshots — installation is operator-side; the house pattern for absent tools is graceful-skip (docs-lint precedent: warn + skip, never fail the gate on a missing optional tool). The project profile (041) carries commands/tree/gates — metric thresholds join it as an optional `metrics` block.

## Decisions

- **D1 — the gate script.** `scripts/metric-gates.sh [--with-mutation]`: runs complexity + duplication always, mutation only with the flag. Each check: tool absent ⇒ `skip:` line, no failure; tool present ⇒ run, compare against thresholds, `FAIL:` per violation. Exit non-zero only on real violations (skips never fail — the docs-lint contract).
- **D2 — thresholds + scope in the profile.** `.workflows/profile.json` optional `metrics` block: `{ "crap_max": 10, "duplication_max": 0.8, "paths": [<tree paths to scan>] }` (default when absent: crap 10 / dup 0.8 / the profile's `tree` paths). profile-lint extends: `metrics` values numeric, paths exist.
- **D3 — wiring tiered.** check-drift section 10 runs `metric-gates.sh` WITHOUT mutation (cheap checks only, graceful-skip). Mutation stays a deliberate per-SHIP/review invocation: `bash scripts/metric-gates.sh --with-mutation` — documented in the script header and README; never in the per-commit drift gate.
- **D4 — install is operator-side.** The script header + README carry the tool install pointers (the ub-mode companion repos, under our gate names). pi-workflows ships no vendored copies.
- **D5 — version 0.13.0** at SHIP (new gate capability → minor bump).

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 gate script + profile metrics + drift section | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 docs + ship prep | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): gate script + profile metrics + drift section — scripts/metric-gates.sh, .workflows/profile.json, scripts/profile-lint.sh, scripts/check-drift.sh ✅
- D1 script + D2 profile block + lint extension + D3 drift section 10. Contract: gate runs clean on this repo (tools absent ⇒ 3 skip lines, exit 0); planted-threshold negative via a temp profile with `crap_max: 0` and a stub tool on PATH (a fake crapper emitting a violation) ⇒ non-zero; profile-lint rejects a non-numeric metric; drift shows section 10; sections 1–9 untouched.

### TASK 2 (Tier A, ⚪): docs + ship — orchestrator-inline ✅
- D4 README install pointers + gate-table mention, CHANGELOG v0.13.0, version bump, full gate chain.

## Adversarial pass (on record)

- Absent tools silently weaken the gate → skip lines are loud (`skip: complexity gate — crapper not installed`); the drift output shows them every run, so absence is visible, not hidden.
- Threshold gaming → thresholds live in the tracked profile, lint-checked numeric; changing them is a tracked diff, reviewable.
- Mutation cost surprise → the flag-gated tier (D3); drift never runs it.
- Stub-tool gaming of the negative probe → the probe uses a throwaway PATH-scoped fake, never the repo's gate config.
- Scope creep → no vendored tools, no new dependencies, no language templates (D4; the 043 stance).

## Verification (whole-plan final gate)

metric-gates exit 0 with 3 skip lines on this repo · planted-threshold negative non-zero · profile-lint numeric checks bite · drift CLEAN with section 10 (sections 1–9 byte-stable) · bun 225/0 · docs-lint exit 0 · cc-check known-finding only · version 0.13.0 · final whole-plan reviewer (read-only over committed evidence — full unfiltered gate output in final-gates.md).
