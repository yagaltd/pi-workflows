spec: task
name: "proof-verdict-functions"
tags: [proofs, verdict, kwant-port, tdd]
verify: "bun test tests/proof-verdict.test.ts tests/proof-ledger.test.ts"
max-rounds: 3
---

## Intent

Port kwant's two evidence rules onto our proof ledger: (1) `exampleVerdict(checks)` — replayable kinds only; `not_replayable` never counts as passed; (2) `evidenceVerdict(owner, checks)` — a task's evidence passes only if ≥1 check was run by someone other than the owner and is replayable-confirmed. TDD: tests first, red, then implement.

## Decisions

- Proof rows gain `runner` (values: `worker | reviewer | orchestrator`; recorded via `--runner` on `record`; rows WITHOUT a runner — historical — read as `runner: "worker"`).
- Proof rows gain `replayable: boolean` (via `--kind replayable|not_replayable` on `record`; default `replayable`).
- Checks array shape passed to the verdict functions: `{ runner?, owner?, status: "passed"|"failed"|"not_replayable", replayable: boolean }` where `owner` is the task owner (worker id).
- `exampleVerdict(checks)` ported 1:1 from kwant `foundry.rs:636`: only non-`not_replayable` statuses count; none → `not_checked`; all counted are `passed` → `passed`; else `failed`.
- `evidenceVerdict(owner, checks)` ported from kwant `missions/mod.rs:359-381`: any `failed`/`not_replayable`-gated failure → `failed`; if no independent (`runner !== owner`) replayable-confirmed passed check exists → `not_independent`; else `passed`. (kwant's `Waiting` maps to `not_independent` — nothing waits in our batch flow.)
- `verify` subcommand classifies a recorded proof: re-run → exit 0 + hash match = `replayable-confirmed`; hash differs = `replayable-drifted`; cannot re-run = `not_replayable`.
- TDD order enforced: write `tests/proof-verdict.test.ts` first (kwant-ported cases below), watch it fail, then implement in `scripts/proof-ledger.mjs` (pure exported functions — no I/O in the verdict functions).
- kwant test ported verbatim: `verdicts never count unreplayable checks as passed` (bun adaptation of foundry.rs:939).

## Boundaries

### Allowed Changes
- scripts/proof-ledger.mjs
- tests/proof-verdict.test.ts (new)
- tests/proof-ledger.test.ts

### Forbidden
- Do not modify scripts/flow-gates.mjs, prompts/, skills/ (TASK 2 owns integration)
- Do not touch .workflows/proofs/proofs.jsonl live data
- Do not add dependencies; verdict functions stay pure (no I/O, no crypto beyond existing sha256)
- Do not change `collect`/`show` output shapes

## Completion Criteria

Scenario: kwant port — unreplayable checks never count as passed
  Test: kwant port — unreplayable checks never count as passed
  Given the ported exampleVerdict
  When checks are all not_replayable, empty, passed+not_replayable, passed+failed, or error
  Then results are not_checked, not_checked, passed, failed, failed — exactly kwant foundry.rs:939

Scenario: evidence verdict — independent replayable check passes
  Test: evidence verdict — independent replayable check passes
  Given owner "worker" and one check {runner:"reviewer", status:"passed", replayable:true}
  When evidenceVerdict runs
  Then "passed"

Scenario: evidence verdict — owner-only evidence holds at not_independent
  Test: evidence verdict — owner-only evidence holds at not_independent
  Given owner "worker" and checks all {runner:"worker", status:"passed", replayable:true}
  When evidenceVerdict runs
  Then "not_independent" — self-attested evidence never passes

Scenario: replayable-drifted evidence fails the verdict
  Test: replayable-drifted evidence fails the verdict
  Given one independent check {runner:"reviewer", status:"passed", replayable:false} (hash drift)
  When evidenceVerdict runs
  Then "failed" — drifted replay is not evidence

Scenario: historical rows default to worker runner and hold at not_independent
  Test: historical rows default to worker runner and hold at not_independent
  Given checks with no runner field (pre-048 rows) all passed
  When evidenceVerdict("worker", checks) runs
  Then "not_independent" — missing runner reads as owner-run

Scenario: record accepts --runner and --kind and stores them
  Test: record accepts --runner and --kind and stores them
  Given a scratch ledger in /tmp
  When recording with --runner reviewer --kind not_replayable
  Then the row carries runner:"reviewer" and replayable:false
