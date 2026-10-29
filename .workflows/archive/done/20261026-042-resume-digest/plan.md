# Plan: resume digest — mechanical restart (042)

> Plan ID: 20261026-042
> Status: SHIPPED 2026-10-29 — v0.12.8 (final gate R1 ok:true, zero findings)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2; T3 W3 inline.

## Context

Restarting work after a long gap is archaeology: the orchestrator re-reads plan.md, LOG, reviews, budget, and git by hand — unbounded model digestion, no fixed shape, no validation. The 2026-10-29 generator study proposed the resume digest (origin: xecute `run dev` state re-materialization + ub-mode "keep a log"): a script emits a fixed-shape state digest; the orchestrator starts from the digest, not from memory. plan 041 landed the project profile (`.workflows/profile.json` — commands, pointers, tree, gates, scaffolds) and its lint (check-drift section 9 — the profile-lint section); this plan makes the digest its first consumer.

## Decisions

- **D1 — the digest script.** `scripts/resume-digest.sh`: read-only; emits fixed sections in order — (1) plan status: Status line + per-task ✅ markers from `.workflows/plan.md` (or "no live plan"); (2) dispatcher context: `queue.json` row count + `.workflows/reviews/` FINAL-verdict count; (3) last 10 `.workflows/LOG.md` lines; (4) budget: `.workflows/budget.json` (or "no budget file"); (5) dirty paths: `git status --short`; (6) gates snapshot: the profile's `gates[]` run in order (tail output) + `commands.test` (tail); (7) `git log --oneline -10`. No mutation anywhere.
- **D2 — profile consumption.** Gates and the test command come from `.workflows/profile.json` (jq-free: python3 JSON, the profile-lint pattern). Missing profile ⇒ fall back to the built-in default set and print one `note:` line — degradation, never silence.
- **D3 — thin trigger.** `prompts/resume.md` (≤ 25 lines): run the digest, then act per house rules (plan lifecycle, `/next`, `/review`) — the digest is the state; the prompt adds no selection logic.
- **D4 — wiring.** README command table gains `/resume`; init's WIRE handoff line names it (a fresh project ships the restart command).
- **D5 — version 0.12.8** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 digest script + repo self-run | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 resume prompt + wiring | task-2.spec | 2 (needs T1 script name) | dispatched Tier B 🟡 |
| T3 CHANGELOG + version | task-3.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): digest script — scripts/resume-digest.sh ✅
- D1 + D2. Contract: the digest runs on this repo (exit 0, all 7 sections present in output); profile fallback note appears when the profile is hidden (negative probe via a moved profile); read-only proof (tree snapshot before/after identical modulo the digest file itself); budget ≤ ~120 script lines.

### TASK 2 (Tier B, 🟡): prompt + wiring — prompts/resume.md, README.md, skills/init/SKILL.md ✅
- D3 + D4. Contract greps: prompt ≤ 25 lines, names the script, no selection logic; README row present; init handoff names /resume.

### TASK 3 (Tier A, ⚪): ship prep + gates-schema fix — orchestrator-inline ✅
- CHANGELOG v0.12.8, version bump, full gate chain.
- AMENDED (T1 escalation): scripts/agents-lint.sh gains a no-arg default (AGENTS.md) — the profile gates[] schema stays arg-free; the digest gates snapshot stops showing the usage FAIL. Allowed extended: scripts/agents-lint.sh.

## Adversarial pass (on record)

- Digest mutates state → read-only contract: the only write is the caller's redirect; the script itself writes nothing (tree-snapshot probe in T1's verification).
- Gate snapshot cost → profile gates are the cheap lints + one `bun test` tail; no benchmark or mutation runs in a digest.
- Missing/degraded inputs → every section degrades to a `note:` line (no profile, no plan, no budget); the digest never exits non-zero for absent optional state (exit 1 only on a broken repo — no .git).
- Prompt creep → D3 pins ≤ 25 lines and no selection logic; the digest is the single source of restart state.
- plan.md parse fragility → markers only (Status line, ✅ count) — the same weak-but-stable contract check-drift already relies on.

## Verification (whole-plan final gate)

digest exit 0 on this repo with all 7 sections · fallback-note negative probe · read-only probe · prompt ≤ 25 lines + greps · README/init rows · drift CLEAN (9 sections) · bun 225/0 · docs-lint exit 0 · cc-check known-finding only · version 0.12.8 · final whole-plan reviewer (read-only over committed evidence — full unfiltered gate output in final-gates.md).
