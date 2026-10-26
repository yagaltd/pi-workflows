# Plan: Proof ledger (025)

> Plan ID: 20261025-025
> Status: APPROVED 2026-10-25 (owner, session-directed — "run 025"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Proofs are recorded
> data — a failing verifier still records its proof; SHIP reads proofs, not
> self-reports.

## Context

Verdicts live in review prose (`ok:true`), gate runs in the judge audit,
dispatches in the run journal — three trails, none keyed per task with the
verifier command and its result. The lessons ledger (queued) needs per-task
proofs: what was run, what exited, what the output hashed to. This plan
records those proofs and unifies the existing trails into per-task evidence.
Origin note (reference only): proof-record pattern studied in the ank audit.

## Decisions

- **D1 — Proofs are recorded data.** `record` runs the task's Verify command
  and appends `{ts, planId, taskId, command, exit, outputHash, specHash?}` to
  `.workflows/proofs/proofs.jsonl` — sha256 over stdout+stderr; `specHash`
  over the contract bytes when `--spec` is given. `record` exits with the
  verifier's exit code, after writing.
- **D2 — Verify detects drift.** `verify --plan --task` re-runs the last
  recorded command and compares exit + outputHash; mismatch ⇒ exit 1 with
  both hashes printed.
- **D3 — Collect unifies, never re-runs.** `collect --plan` merges the run
  journal (dispatched/done/failed), review verdicts (`ok:true` presence),
  and proof counts into `.workflows/proofs/evidence-<plan>.json`; tasks with
  dispatches but no `done` and no proof are flagged `missing-evidence`.
  Judge audit + intent trail are referenced by path (row counts), not
  re-parsed per task.
- **D4 — Prompt protocol.** After a verdict settles, `/next` + `/auto-next`
  record the proof (one line each). SHIP reads `evidence-<plan>.json` when
  present. Extension hook deferred.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `proof-ledger.mjs` — record / show / verify | task-1.spec | 1 | @model:standard |
| T2 `collect` — unified per-task evidence | task-2.spec | 2 | @model:standard |
| T3 Wiring + docs + release | task-3.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): proof record / show / verify
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/proof-ledger.mjs, tests/proof-ledger.test.ts
- **Verify**: bun test

### TASK 2 (Tier B, 🟡): collect — unified evidence
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: scripts/proof-ledger.mjs, tests/proof-collect.test.ts
- **Verify**: bun test

### TASK 3 (Tier A, ⚪): wiring + docs + release
- **Status**: ✅ DONE
- **Wave**: 3
- **Depends On**: TASK 1, TASK 2
- **tdd**: false
- **Allowed**: prompts/next.md, prompts/auto-next.md, README.md, CHANGELOG.md, package.json, tests/proof-docs.test.ts
- **Verify**: bash scripts/check-drift.sh && bash scripts/docs-lint.sh

## Execution Notes

- TASK 1 ✅ context: no changes — record/show/verify; outputHash sha256(stdout+stderr); record exits with the verifier exit after writing.
- TASK 2 ✅ context: no changes — collect merges journal + reviews + proof counts; missing-evidence flag; judge/intent trails referenced by path.
- TASK 3 ✅ context: no changes — proof record lines in /next + /auto-next; README Proof ledger section; v0.9.3.
- Wave settle (deterministic): 3/3 ok:true; bun test 173/173; golden 11/11, 0 flips.

## Docs impact

- `README.md` — Proof ledger section (names record + collect commands)
- `prompts/next.md` — proof record line after verdict persistence
- `prompts/auto-next.md` — proof record line in the Budget + journal block
- `CHANGELOG.md` — v0.9.3 entry (plan 20261025-025)
- `package.json` — version 0.9.3
