# Plan: project profile — machine-readable project facts (041)

> Plan ID: 20261026-041
> Status: SHIPPED 2026-10-29 — v0.12.7 (final gate R2 ok:true, zero findings)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2; T3 W3 inline.

## Context

The 2026-10-29 generator study (xecute — origin: Rust architecture toolkit; ub-mode — origin: discipline skill) settled the pattern: conventions live in machine-readable artifacts, prose carries only what cannot be computed. pi-workflows' gap: project facts (test/lint commands, tree domains, docs paths, gate names) exist only in prose — init's Phase 5 (the WIRE step: charter, context, README, handoff) writes them into AGENTS.md/CONTEXT.md by hand, every consumer re-derives them, and nothing validates them against the tree. This plan lands the keystone artifact; the consumers (context packs, resume, scaffolds) migrate in later plans.

## Decisions

- **D1 — the artifact.** `.workflows/profile.json` (tracked exception, like LOG): `commands` (test/lint/build), `pointers` (canon, docs-policy, registry, adr-index, map — each a repo path), `tree` (domains: name + path, from the documented tree), `gates` (names in run order), `scaffolds` (kind → template dir + target; empty allowed — the scaffolds plan consumes this), `meta` (generated_by: init | init --adopt | plan; generated_at; stale_after +30d).
- **D2 — profile-lint.** `scripts/profile-lint.sh`: schema fields present; every pointer/tree path exists on disk; command first words resolvable (`command -v`); gates named exist under `scripts/`; stamps within budget. One `FAIL:` per violation; non-zero exit. Wired into `scripts/check-drift.sh` as section 9.
- **D3 — init wiring.** Phase 5 WIRE generates the profile: greenfield — fill from the Phase 1–4 interview facts; brownfield — `init --adopt`: derive from build manifests (`Cargo.toml`/`package.json`/`pyproject.toml`) + dir structure, present the draft for owner correction before the handoff. A profile-lint failure blocks the handoff (same rule as agents-lint).
- **D4 — repo self-adoption.** pi-workflows' own profile written (tracked exception in `.gitignore`) and passing profile-lint.
- **D5 — consumer migration deferred.** Context packs, resume, scaffolds read the profile in their own plans (042+). This plan ships the artifact, the lint, and init generation only.
- **D6 — version 0.12.7** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 profile-lint + repo profile + drift section | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 init generation + adopt mode | task-2.spec | 2 (needs T1 lint name) | dispatched Tier B 🟡 |
| T3 CHANGELOG + version | task-3.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): lint + repo profile + drift section — scripts/profile-lint.sh, .workflows/profile.json, .gitignore, scripts/check-drift.sh ✅
- D1 schema (lint-embedded), D2 lint + drift section 9, D4 self-adoption. Contract: lint exit 0 on the repo profile; negative probes (dead pointer, dead command, missing section) each non-zero; drift CLEAN with the new section.

### TASK 2 (Tier B, 🟡): init generation — skills/init/SKILL.md ✅
- D3 WIRE gains the profile step (generate → lint → blocks handoff) + the `--adopt` derivation procedure. Contract greps: profile.json named; adopt mode present; lint failure blocks.

### TASK 3 (Tier A, ⚪): ship prep — orchestrator-inline ✅
- CHANGELOG v0.12.7, version bump, full gate chain.

## Adversarial pass (on record)

- Duplication with AGENTS.md pointers → canon rule 5 (machine truth lives apart): the profile is machine truth; AGENTS.md pointers stay agent-facing one-liners. Cross-checking the two is a later agents-lint enhancement, not this plan.
- Stale profile → `meta.stale_after` enforced by profile-lint (the docs-lint stamps pattern).
- Fictional paths (the mdflows failure class) → profile-lint existence checks on every pointer/tree path; negative probes prove the lint bites.
- Scope creep into consumers → D5 pins the boundary; resume/scaffolds/packs read the profile only in their own plans.
- Language-agnostic stance → no language-specific fields; commands are strings the project declares, not schemas pi-workflows infers at runtime.

## Verification (whole-plan final gate)

profile-lint exit 0 on the repo profile + negative probes fail · init WIRE + adopt greps · drift CLEAN incl. section 9 · bun 225/0 · docs-lint exit 0 · cc-check known-finding only · version 0.12.7 · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern; full unfiltered gate output in final-gates.md).
