# Plan: Lessons ledger (026)

> Plan ID: 20261025-026
> Status: APPROVED 2026-10-25 (owner, session-directed — "run 026"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. The ledger is
> append-only: transitions add entries, history is never rewritten, and a
> status change without a recorded reason is refused.

## Context

Proofs (025), judge audits, the intent trail, and archived verdicts exist as
separate trails. The lessons ledger distills them at archive time into
reusable per-task lessons with provenance — so `/plan` drafts and
`/challenge` grills read what already worked or failed, sourced from proofs
rather than self-reports. Governance rule borrowed from the memory project:
never change a lesson status without a recorded reason.

## Decisions

- **D1 — Ledger is append-only.** `.workflows/lessons/lessons.jsonl`;
  entries: lesson records `{type:"lesson", id, ts, planId, taskId, lesson,
  status, provenance, sources}` and transition records
  `{type:"transition", target, to, reason, ts}`. Current status = last
  transition (or the lesson's own status).
- **D2 — Provenance is computed, not claimed.** `verified` when the task has
  a recorded proof in `proofs.jsonl`; `from_untrusted` otherwise. Status:
  `valid` (done + ok:true), `failed` (❌), else `speculative`.
- **D3 — Distill at SHIP.** `distill --plan-file <archived plan.md>
  --reviews-dir <dir> --proofs <file> --ledger <file>` parses the archived
  bundle and appends lessons. Idempotent per `(planId, taskId)`: re-distill
  updates nothing — a second distill of the same bundle is a no-op.
- **D4 — Transitions are deliberate.** `set --id --status --reason` —
  refused without `--reason`. `list` filters by status, tag, or text over
  current-status lessons.
- **D5 — Wiring at SHIP only.** `/review` Stage 3 runs distill after the
  archive move. `/plan` + `/challenge` consumption is a follow-up once
  lessons accumulate.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `lessons.mjs` — distill / set / list | task-1.spec | 1 | @model:standard |
| T2 SHIP wiring + docs + release | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): ledger engine
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/lessons.mjs, tests/lessons.test.ts
- **Verify**: bun test

### TASK 2 (Tier A, ⚪): wiring + docs + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: prompts/review.md, README.md, CHANGELOG.md, package.json, tests/lessons-docs.test.ts
- **Verify**: bun test

## Execution Notes

- TASK 1 ✅ context: no changes — distill (idempotent per planId+taskId), set (reason-refused transitions), list (status/tag/text); provenance computed from proofs.jsonl.
- TASK 2 ✅ context: no changes — review Stage 3 distill step; README Lessons ledger section; v0.10.0; real-bundle distill test made rerun-safe (idempotency).
- Wave settle (deterministic): 2/2 ok:true; bun test 178/178; golden 11/11, 0 flips.

## Docs impact

- `README.md` — Lessons ledger section (names distill + set commands)
- `prompts/review.md` — Stage 3 distill line
- `CHANGELOG.md` — v0.10.0 entry (plan 20261025-026)
- `package.json` — version 0.10.0
