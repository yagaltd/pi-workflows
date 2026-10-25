# Review — task-1
Task: Hygiene — spec archive, plan status header, await-loop economy (T1 · D3+D4+D5) · Contract: .workflows/specs/task-hygiene-archive.spec

## Round 1 — 2026-08-22 · reviewer-a
**ok: false**
### Findings
1. [P1] Boundary excursion outside the spec's then-Allowed whitelist — evidence: worker relocated the pre-existing 003-era stray `task-reviewer-void.spec` from `.workflows/archive/done/20260822-003-landing-hardening/specs/` to the 003 archive plan root, a path not listed in Allowed Changes at the time.

## Round 2 — 2026-08-22 · reviewer
**ok: true**

Basis: spec amended (2× `AMENDED (round 2` at Allowed Changes + Completion Criteria, with filename-collision/content-preserved rationale); stray present at `.workflows/archive/done/20260822-003-landing-hardening/task-reviewer-void.spec` (1956 B non-empty); 003 specs/ = 5, 004 specs/ = 4, live `.workflows/specs/` = 5; `git status --porcelain` = only `M agents/execution-doctrine.md` — no state drift.