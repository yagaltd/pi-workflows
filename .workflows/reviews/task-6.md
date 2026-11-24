# Review — task-6
Task: Close-out/SHIP wiring · Contract: .workflows/specs/task-6.spec

## Round 1 — 2026-11-23 · reviewer
**ok: true**

Evidence:
- lifecycle PASS; `bun test tests/closeout.test.ts tests/closeout-wiring.test.ts` 9 pass / 2 skip / 0 fail, 113 assertions.
- Text sections and mandatory six-column Next moves table stay canonical; judge input stays `reportText`.
- Branch diff touches only `scripts/closeout.mjs`, `tests/closeout.test.ts`, `tests/closeout-wiring.test.ts`.
- Tripwire OK [S1]/[S2].

No findings.
