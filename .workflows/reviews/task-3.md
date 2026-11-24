# Review — task-3
Task: Advisory chooser consumes deterministic policy · Contract: .workflows/specs/task-3.spec

## Round 1 — 2026-11-23 · reviewer
**ok: true**

Evidence:
- lifecycle PASS; `bun test tests/format-chooser.test.ts` 5/5, 44 assertions.
- Policy is the sole authority (`scripts/format-chooser.mjs:95-116`); judge answers stay advisory.
- Branch diff touches only `scripts/format-chooser.mjs` and `tests/format-chooser.test.ts`.
- Tripwire OK [S1]/[S2].

No findings.
