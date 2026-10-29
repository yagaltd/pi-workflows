# Plan: readme-rebuild — shop window only (045)

> Plan ID: 20261026-045
> Status: SHIPPED 2026-10-29 — v0.13.1 (final gate R1 ok:true; one P1 bookkeeping mark fixed per the reviewer fix direction)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2 inline.

## Context

README.md is 924 lines (2026-10-29 audit): ~320 lines of "How It Works" architecture narration (canon assigns explanation/reference to `docs/`), four version-titled sections ("Doc-drift gate (v0.8.3)", "Casual intake (v0.8.4)", "Judge (v0.11.0)", "Dispatcher (v0.8.0)") — history that DOCS-POLICY bans outside CHANGELOG.md — and 51 table rows against 23 prompts on disk. Cause: nine plans each correctly added their row under the freshness rule; no rule bounded size or placement. All other supporting docs are current (DOCS-POLICY, canon, AGENTS.md, CHANGELOG). Shape approved by the owner 2026-10-29.

## Decisions

- **D1 — README rebuild (~150–200 lines).** Sections only: what it is (1 para) · Install · Quick Start · Commands table (regenerated against `prompts/*.md` — every prompt one row, no orphans) · The loop (short: plan → approve → dispatch → gate → SHIP) · Gates table (the 10 check-drift sections, one row each) · Pointers (AGENTS.md charter, docs/canon.md, docs/architecture.md, CHANGELOG) · License. No architecture narration, no version-titled sections, no history.
- **D2 — extraction.** "How It Works" (~L158–475) moves to `docs/architecture.md` (new), updated to the v0.13.0 state: dispatch_next tool, verdict automation, project profile, agents-lint/profile-lint, scaffolds, metric gates, /resume. Claims carry gates (canon rule 4).
- **D3 — CHANGELOG dedupe.** The README version-titled sections are removed, not deleted: verify each has its CHANGELOG counterpart (from SHIP); missing ones are appended under their original dates. README loses them regardless (history ban).
- **D4 — doctrine closure.** `templates/DOCS-POLICY.md` README section gains: README stays ≤ ~200 lines; architecture narration belongs to `docs/architecture.md`; history belongs to CHANGELOG. (The sentence that was missing when the bloat grew.)
- **D5 — version 0.13.1** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 extraction + README rebuild + CHANGELOG dedupe | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 doctrine line + ship prep | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): extraction + rebuild — README.md, docs/architecture.md, CHANGELOG.md
- D1 rebuild + D2 extraction + D3 dedupe. Contract: README ≤ 200 lines with the 7 sections; commands table rows == prompts count; zero version-titled headings; zero "How It Works" prose in README; docs/architecture.md carries the extracted sections updated to v0.13.0; CHANGELOG verified/patched for the four removed sections.

### TASK 2 (Tier A, ⚪): doctrine line + ship — orchestrator-inline ✅
- D4 DOCS-POLICY sentence, CHANGELOG v0.13.1, version bump, full gate chain (10 sections).

## Adversarial pass (on record)

- Content loss in extraction → the contract pins the four removed sections' CHANGELOG counterparts; architecture.md carries the full How-It-Works inventory (section list in the contract greps).
- Commands table drift (the 51-vs-23 class) → the table is regenerated from `ls prompts/*.md` with descriptions from each prompt's frontmatter; drift section 7 keeps validating rows ↔ prompts.
- Stale numbers in the moved architecture doc → every v-titled/gate claim re-checked against the 0.13.0 state during extraction (T1 contract: section list matches the live gate chain).
- README too lean → the 7-section floor is grepped; the shop window still answers what/install/how in one read.

## Verification (whole-plan final gate)

README ≤ 200 lines, 7 sections, table == prompts, zero version-titled/v0.8.x headings · docs/architecture.md carries the extracted flow with v0.13.0 claims · CHANGELOG counterparts verified · DOCS-POLICY budget sentence · drift CLEAN (10 sections) · bun 225/0 · docs-lint exit 0 · cc-check known-finding only · version 0.13.1 · final whole-plan reviewer (read-only over committed evidence — full unfiltered gate output in final-gates.md).
