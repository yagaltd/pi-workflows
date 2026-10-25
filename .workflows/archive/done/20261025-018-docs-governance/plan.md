# Plan: docs governance — doc-drift gate + refactor-first/docs-impact (018)

> Plan ID: 20261025-018
> Status: SHIPPED 2026-10-25 — v0.8.3 (final gate review-final ok:true, first pass)
> Created: 2026-10-25
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1 (dispatch); T2 W1 (inline); T3 W2 (dispatch); T4 W3 (inline).

## Context

Backlog items 5 + 6 (`.workflows/proposals/20261024-session-backlog.md`), merged by subsystem (docs governance around the canon + docs-lint landed in plan 20261024-014):

- **Item 5 — doc-drift gate**: extend `scripts/docs-lint.sh` with (a) stamp enforcement — generated docs declaring `generated_by` must carry `generated_at` + `stale_after`, and expired stamps fail; (b) claim-to-gate mapping — behavioral claims in the charter and guides must name their gate; (c) optional pre-push hook wiring.
- **Item 6 — refactor-first + docs-impact gates**: a proposal template with mandatory Refactor assessment + Docs impact sections (overlap → verdict enum, block to human on miss), and an archive gate: SHIP refuses when declared docs + changelog are not updated.

Living proof the gates are needed: `docs/canon.md` rule 2 still cites "doc-drift gate, backlog item 4" — stale since the 2026-10-24 reorder (the gate is item 5). The canon drifts today; this plan fixes it with its own gate.

## Decisions

- **D1 — Stamp enforcement (item 5a).** New docs-lint section: a file that declares `generated_by` must also carry `generated_at` + `stale_after`; a stamp older than its `stale_after` date is a finding (fail). Files without `generated_by` are exempt — hand-written docs do not stamp (no false positives by construction).
- **D2 — Claim-to-gate mapping (item 5b).** docs-lint scans `AGENTS.md` + `docs/**` (charter + guides — the curated, low-noise surface; skills/prompts excluded for rollout) for claim lines (imperative `must`/`must not`/`never` patterns outside code spans) lacking a gate reference (a backtick command/path or `gate:` token on the same line or the doc's policy table). Missing gate ⇒ finding. `DRIFT_CLAIM_SCOPE` env narrows the scan during rollout.
- **D3 — Pre-push hook (item 5c).** `scripts/install-git-hooks.sh` installs a `pre-push` hook running `docs-lint.sh`. Optional, owner-runnable, documented in README — not wired by default.
- **D4 — Proposal template (item 6a).** `templates/PROPOSAL-FORMAT.md`: mandatory sections — Refactor assessment (overlap scan result + verdict enum: `clean-slate | extend | refactor-first`; overlap discovered mid-plan ⇒ block to human) and Docs impact (declared doc paths + CHANGELOG entry). `prompts/plan.md` references the template at draft time.
- **D5 — Archive gate (item 6b).** `scripts/check-archive.sh <plan-dir>`: reads the shipped plan's Docs impact declaration, verifies each declared doc exists and CHANGELOG mentions the plan ID; wired into the SHIP step (`skills/plan/SKILL.md` SHIP rule + `prompts/review.md`). Failure blocks the archive move.
- **D6 — Canon drift fix + version 0.8.3** at SHIP. Fix the stale "backlog item 4" reference in canon rule 2 (first real catch for the new gate).

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 docs-lint drift sections (stamps + claim-to-gate) | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 templates/PROPOSAL-FORMAT.md | task-2.spec | 1 | orchestrator-inline Tier A |
| T3 check-archive.sh + SHIP wiring | task-3.spec | 2 (needs T2) | dispatched Tier B 🟡 |
| T4 canon fix + README + CHANGELOG v0.8.3 | task-4.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): docs-lint drift sections — scripts/docs-lint.sh ✅
- D1 + D2 sections with fixture docs (stamped current, stamped expired, missing stamps, claims with/without gates). bun/`tests` untouched; bash fixtures in a `tests/docs-lint/` fixture dir or inline heredocs.

### TASK 2 (Tier A, ⚪): templates/PROPOSAL-FORMAT.md — orchestrator-inline ✅
- D4 template + a one-line pointer from `prompts/plan.md` draft guidance.

### TASK 3 (Tier B, 🟡): check-archive.sh + SHIP wiring — scripts/check-archive.sh, skills/plan/SKILL.md, prompts/review.md ✅
- D5 script (grep-based, exit non-zero on missing declared docs / missing CHANGELOG mention) + SHIP-step wiring. Contract scenarios use fixture plan dirs.

### TASK 4 (Tier A, ⚪): canon fix + docs + ship — orchestrator-inline ✅
- D6 canon reference fix, README hook section, CHANGELOG v0.8.3, full gate chain.

## Adversarial pass (on record)

- Claim-scan noise (prose "must" inside examples) → scan skips fenced code spans; rollout scoped to AGENTS.md + docs/**; `DRIFT_CLAIM_SCOPE` narrows further; noise ⇒ scope trim (documented), never silent exemption.
- Stamp false positives → only self-declared files are checked.
- check-archive.sh depends on proposal format adoption → T2 lands first; the script reads the template's section names, so pre-template proposals fail loudly with a format hint.
- Pre-push hook is owner-machine only — CI wiring stays out of scope.
- bun side untouched: `tests/**` excluded from this plan; drift sections are bash + fixtures.

## Verification (whole-plan final gate)

docs-lint drift sections green on the repo (canon fixed = the live proof) · fixture docs prove expired-stamp, missing-stamp, and missing-gate findings · check-archive fixture plan passes/fails as designed · drift CLEAN · bun 109/109 · docs-lint exit 0 · selector lint clean · cc-check known-finding only · final whole-plan reviewer (read-only over committed evidence — the 015–017 pattern).
