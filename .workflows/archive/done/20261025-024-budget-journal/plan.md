# Plan: Budget + journal (024)

> Plan ID: 20261025-024
> Status: APPROVED 2026-10-25 (owner, session-directed — "run 024"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Verdict-or-budget:
> the loop stops on plan completion OR budget exhaustion — whichever first —
> and resume reads the journal, never agent memory.

## Context

`/auto-next` runs autonomously with no stop condition except blockers and
plan completion; cost tracking exists in the dispatch ledger but nothing
enforces a ceiling. Runs leave no machine-readable trail of dispatches and
verdicts — resume means re-reading plan.md and reviews by hand. This plan
adds the budget object, the run journal, and the mechanical resume.

## Decisions

- **D1 — Journal is append-only JSONL.** `.workflows/journal.jsonl`;
  entries `{ts, planId, taskId?, event: dispatched|done|failed|blocked|
  budget-exhausted, cost?, note?}`. `scripts/run-journal.mjs` owns
  append / read / check / resume.
- **D2 — Budget is config.** `.workflows/budget.json`:
  `{max_tasks?, max_cost_usd?}` — optional file; absent ⇒ no ceiling.
  Spent: dispatched-task count and summed recorded cost. `check` exits 1 on
  exhaustion — the gate the loop reads before each dispatch.
- **D3 — BUDGET STOP is loud.** On exhaustion the protocol records
  `budget-exhausted` in the journal, prints done-vs-remaining with the
  resume command, and stops. Raising the budget is the owner's act
  (edit `budget.json`), never the agent's.
- **D4 — Prompt protocol, no engine change.** `resolveNext` stays pure; the
  budget check and journal records ride the `/auto-next` + `/next`
  protocols. Extension hook deferred.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `run-journal.mjs` — journal, budget check, resume | task-1.spec | 1 | @model:standard |
| T2 Prompt wiring + docs + release | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): journal + budget engine
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/run-journal.mjs, tests/run-journal.test.ts
- **Verify**: bun test

### TASK 2 (Tier A, ⚪): wiring + docs + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: prompts/auto-next.md, prompts/next.md, README.md, CHANGELOG.md, package.json, tests/budget-wiring.test.ts
- **Verify**: bun test

## Execution Notes

- TASK 1 ✅ context: no changes — record/check/resume; spent = dispatched count + summed cost; budget-exhausted is recorded data.
- TASK 2 ✅ context: no changes — auto-next Budget + journal block (BUDGET STOP protocol), next record protocol, README section, v0.9.2.
- Wave settle (deterministic): 2/2 ok:true; bun test 166/166; golden 11/11, 0 flips.

## Docs impact

- `README.md` — Run budget + journal section (names the check + resume commands)
- `prompts/auto-next.md` — budget/journal protocol steps
- `prompts/next.md` — record protocol
- `CHANGELOG.md` — v0.9.2 entry (plan 20261025-024)
- `package.json` — version 0.9.2
