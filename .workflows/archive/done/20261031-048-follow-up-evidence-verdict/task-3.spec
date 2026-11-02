spec: task
name: "evidence-gate-completion-fix-round"
tags: [bug-fix, evidence-verdict, flow-schema, kwant-port]
verify: "bun test tests/proof-verdict.test.ts tests/proof-ledger.test.ts tests/flows-validate.test.ts tests/flows-run.test.ts"
max-rounds: 3
---

## Intent

Fix round for the 4 bug-hunter-confirmed defects in the evidence-verdict port (plan 20261031-048 whole-plan review Stage 2, run_mvz1lwhg_eawmvs): BUG-1 gate unreachable via flows (GATE_NAMES + taskId), BUG-2 cross-plan evidence borrowing (planId scoping), BUG-3 verifyLast dropped the recorded-exit comparison, BUG-4 --kind fail-open validation. PERSISTED POST-HOC from the inline fix-round prompt for archive completeness — the worker ran from that inline contract.

## Decisions

- GATE_NAMES += "evidence"; gate-step optional `taskId` (non-empty string when present); flow-run passes `s.taskId` into `runGate("evidence", { taskId, planId: flow-<slug> })`; unknown gate names still rejected.
- `evidenceGate(taskId, { ledger, planId })` filters rows by `planId` AND `taskId` — cross-plan rows never leak.
- `verifyLast` restores the recorded-exit comparison (0e58ecc semantics): replayable-confirmed requires re-run exit === recorded exit AND hash match; exit mismatch → `replayable-drifted`.
- `record --kind` validates ∈ {replayable, not_replayable}; anything else → usage error exit 2, NO row written (fail-closed).
- TDD: tests first (5 new tests, confirmed red pre-fix), then implement. In-scope tweak: flow-run's probe script path made absolute (cwd-independent) for fixture-ledger tests.

## Boundaries

### Allowed Changes
- scripts/flow-schema.mjs
- scripts/flow-validate.mjs
- scripts/flow-run.mjs
- scripts/flow-gates.mjs
- scripts/proof-ledger.mjs
- tests/proof-verdict.test.ts, tests/proof-ledger.test.ts, tests/flows-validate.test.ts, tests/flows-run.test.ts

### Forbidden
- Do not modify agent-spec binary, prompts/, skills/, .workflows/ live data
- Do not change other gate names or their semantics
- skills/flows/SKILL.md gate list was stale (missing evidence) — reported outside scope, fixed separately

## Completion Criteria

Scenario: BUG-1 — evidence gate reachable via flows
  Test: evidence gate reachable via flows
  Given a schema-valid flow with an evidence gate-step carrying taskId
  When flow-validate + flow-run execute
  Then validate exit 0 and runGate("evidence") executes, judging not_checked under planId flow-<slug>

Scenario: BUG-2 — cross-plan evidence rejected
  Test: cross-plan evidence rejected
  Given plan-OLD reviewer rows for taskId t1 and plan-NEW with no rows
  When evidenceGate('t1', { planId: 'plan-NEW' }) runs
  Then fail not_checked — no cross-plan leak

Scenario: BUG-3 — replay-confirmed requires exit match
  Test: replay-confirmed requires exit match
  Given a recorded exit=1 proof re-run to exit=0 with byte-identical output
  When verifyLast classifies
  Then NOT replayable-confirmed (exit mismatch → drifted/not_replayable)

Scenario: BUG-4 — kind validation fail-closed
  Test: kind validation fail-closed
  Given record --kind not-replayable (typo)
  When proof-ledger record runs
  Then usage error exit 2, no row written

Scenario: regression — known pre-existing failures unchanged
  Test: regression — known pre-existing failures unchanged
  Given the full suite at merged HEAD
  When bun test runs
  Then exactly the known 14 pre-existing failures (extension.test.ts auto-gate + verdict automation), zero new failing names
