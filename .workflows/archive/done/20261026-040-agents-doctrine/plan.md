# Plan: agents-doctrine — AGENTS.md core + pointers + lint (040)

> Plan ID: 20261026-040
> Status: SHIPPED 2026-10-29 — v0.12.6 (final gate R2 ok:true, zero findings)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2 (needs T1's lint name); T3 W3 inline.

## Context

AGENTS.md is the most expensive real estate in the system: pi auto-loads it for every session and every subagent (templates/DOCS-POLICY.md — binding rules + one-liner facts + pointers, nothing else). The doctrine exists but nothing enforces it. Field failures: mdflows — a hand-written 7-line AGENTS.md with a fictional path claim (`customization/workflows/` does not exist), a plan-ID history leak (`since 20261028-004`), and no charter shape; init (skills/init Phase 5 — the WIRE step: charter, context, README skeleton, handoff) was skipped because the project started spike-first. MorphEditor — a 287-line old-style charter with a history-laden member map and hardcoded ADR paths. The 2026-10-29 ub-mode study: no direct import; its core-behavior charter shape informs Layer 1, its metric tools are backlog (D5).

## Decisions

- **D1 — template restructure.** `templates/AGENTS.md` becomes three blocks: **CORE** (binding behavior: containment, commit discipline, refactor-first before new features, TDD, subtract-before-add, fix root causes, docs discipline — ~25 lines, stable, reviewed like code), **POINTERS** (machine-greppable one-liners: `Test:` command, map/ADR-index/registry/skills pointer targets, `<placeholder>`-marked for init to fill), **PROJECT** (project-specific binding rules). Line budget ≤ 60.
- **D2 — agents-lint.** `scripts/agents-lint.sh <agents-md>`: (a) every backtick-quoted repo path in pointer lines exists on disk; (b) the CORE section is present; (c) line budget ≤ 60; (d) no plan-ID history refs (`2026[0-9]{4}-[0-9]{3}` pattern); (e) no nested `AGENTS.md` referenced as a pointer target. Non-zero exit on any violation. Wired into `scripts/check-drift.sh` as a section validating the repo's own AGENTS.md.
- **D3 — init wiring.** `skills/init` Phase 5 WIRE step 1 rewritten: generate the project AGENTS.md from the restructured template, fill `<placeholder>` pointers from the Phase 1–4 facts, run `agents-lint.sh` before the handoff — generation without validation is how mdflows happened.
- **D4 — repo self-migration.** The repo's own AGENTS.md migrates to the new structure and passes agents-lint (current content verified via `git show HEAD~40:AGENTS.md` / history first — the working copy may be a stub).
- **D5 — metric gates deferred.** Complexity/duplication/mutation gates (origin: ub-mode companion tools, renamed under our names at adoption) are BACKLOG — not this plan.
- **D6 — version 0.12.6** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 template restructure + agents-lint + repo migration | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 init wiring + doctrine pointers | task-2.spec | 2 (needs T1 lint name) | dispatched Tier B 🟡 |
| T3 CHANGELOG + version + gates | task-3.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): template + lint + self-migration — templates/AGENTS.md, scripts/agents-lint.sh, AGENTS.md ✅
- D1 restructure + D2 lint script + D4 repo migration. Contract greps: the three blocks present; agents-lint exits 0 on the migrated AGENTS.md; planted-violation negative check (a temp copy with a dead pointer fails); budget holds.

### TASK 2 (Tier B, 🟡): init wiring — skills/init/SKILL.md, templates/DOCS-POLICY.md ✅
- D3 Phase 5 WIRE rewrite (generate → fill placeholders → agents-lint → handoff) + DOCS-POLICY pointer to the lint. Contract greps: the WIRE step names agents-lint; the DOCS-POLICY AGENTS.md section references the lint as the enforcement gate.

### TASK 3 (Tier A, ⚪): ship prep + drift wiring — orchestrator-inline ✅
- CHANGELOG v0.12.6, version bump, full gate chain.
- AMENDED (T2 escalation): check-drift gains the agents-lint section (D2 wiring; DOCS-POLICY forward reference lands). Allowed extended: scripts/check-drift.sh.

## Adversarial pass (on record)

- Dead-pointer drift (the mdflows bug) → agents-lint rule (a) makes pointer resolution mechanical; planted-violation negative test proves the lint bites.
- Line-budget creep → rule (c) enforced on the repo's own file first (eat our own cooking).
- History refs return → rule (d) pattern-bans plan IDs; the LOG stays the only provenance home.
- init without validation recurs in other projects → rule: D3 makes agents-lint part of init's handoff, not an optional extra.
- Legacy projects (MorphEditor) migrate later → out of scope; the lint + template are the product; migration is an application (follow-up plans per project).

## Verification (whole-plan final gate)

agents-lint exit 0 on the migrated repo AGENTS.md + planted-violation failure · init WIRE greps · drift CLEAN · bun 225/0 · docs-lint exit 0 · cc-check known-finding only · version 0.12.6 · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern).
