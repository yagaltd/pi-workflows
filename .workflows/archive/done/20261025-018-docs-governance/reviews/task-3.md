# Task 3 — check-archive.sh + SHIP wiring (plan 20261025-018)

## Round 1 — FINAL — ok: TRUE (reviewer pw18-t3-reviewer)
- Layer 1: 3/3 contract Test greps exit 0; parse/lint clean; lifecycle 3/3 Skip = the recorded docs-contract binding artifact (verbatim bash authoritative).
- Layer 1b: guard --spec single-file — zero violations; diff = exactly the 3 allowed files.
- Layer 2: n/a.
- Layer 3 fixture proofs (reviewer-run): pass → exit 0; missing declared doc → exit 1 naming path; missing CHANGELOG mention → exit 1 naming file + Plan ID; missing Docs impact section → exit 1 with templates/PROPOSAL-FORMAT.md hint; no-arg/bad-dir → exit 2; runs cross-cwd. bun 115/115; drift CLEAN.
- Wiring: skills/plan/SKILL.md:227 SHIP-gate bullet + prompts/review.md:124 gate line before the bundle move.
