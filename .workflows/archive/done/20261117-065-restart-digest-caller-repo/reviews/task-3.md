# Review — task-3

## Round 2 — 20261117 · reviewer

- Verdict: **ok: false**
- Findings: [P0] the contract verify line failed — `bun test` red (400 pass / 9 skip / 1 fail);
  `tests/archive-drift.test.ts:98 expect(result.status).toBe(0)` received 1. Root cause: the
  `beyond-window` fixture held a single orphan bundle (`20260101-901-first`) for an id its
  CHANGELOG never names, so all ten in-window ids were genuinely unbundled and §11 correctly
  reported ten findings. Fix direction: materialise the fixture premise; never relax the
  assertion or weaken §11's window logic.

## Round 3 — 20261117 · reviewer

- Verdict: **ok: true**
- Layer 1 agent-spec: lifecycle 7/7 scenarios pass. Guard: worktree-scope run is vacuous
  (`.workflows/specs` is gitignored, absent in a worktree → 0 specs); re-run with the spec staged
  in a temp dir → "1 spec(s) passed".
- Layer 2 tdd-gate: skipped (not installed — the decision's own premise).
- Layer 3 project: `archive-drift` 18/18 incl. the round-2 P0 case; full `bun test` 401 pass /
  9 skip / 0 fail (410 tests, 46 files; all skips pre-existing env-gated cases, new file has no
  skip/todo/only); `check-drift.sh` exit 0 — §11 "9 ids, first 10 CHANGELOG entries", §12 all ten
  whitelisted durable paths tracked + ledger CLEAN. cc-check absent → Contracts skipped.
- Assertion integrity: `status===0` / `stderr===""` kept and **strengthened** with
  `toContain("(10 ids")` + `not.toContain("20251231-999")`; `check-drift.sh` window is positional
  (`if (entry > 10) exit`).
- Negative proofs on /tmp copies: unbundle 907 → exit 1; move 999 to entry 1 → exit 1;
  strip backticks → check-archive exit 1; untrack decisions → §12 exit 1; template without
  `Rule:` → ledger finding + §12 exit 1.
- Scope: 36 files, all inside Allowed Changes; plan.md, LOG.md, decisions/** untouched.
- Open questions (out of scope): `scripts/decisions.mjs:68` maps a non-`# DEC-<n>:` heading to
  `id=null` and still reports CLEAN (pre-existing, carried to TASK 7); `task-3.spec` declared
  `max-rounds: 2` while this was round 3 (spec corrected to 3).
