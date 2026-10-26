# Plan: Judge backend → typesafe + decision brief (029)

> Plan ID: 20261025-029
> Status: APPROVED 2026-10-25 (owner, session-directed — "A+B can be done now then C+D"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Two moves: the judge
> client speaks typesafe System One (jev-latest); the close-out renders next
> moves from structured queue data — never from model memory.

## Context

Verified live: `~/.pi/agent/auth.json` carries `typesafe.key`; a real
`/v1/systemone` call returned `noul 0.98`, `choice ship @ 0.92`. Every
question pi-workflows asks is noul- or choice-shaped. typellm is unused
capacity. And close-outs end in prose option lists — the owner asked for a
decidable table, enforced.

## Decisions

- **D1 — judge.mjs backend is typesafe System One.** Endpoint
  `https://api.typesafe.ai/v1/systemone`, model `TYPESAFE_MODEL` or
  `jev-latest`. Key chain: `TYPESAFE_API_KEY` env → `~/.pi/agent/auth.json`
  `.typesafe.key`. `ask()` signature unchanged; verdict rows gain
  `confidence` + `probabilities`. Loud skips unchanged (missing key,
  unreachable, non-JSON). typellm env vars and endpoint are gone.
- **D2 — Question translation is explicit.** `schema.enum [yes,no]` or
  `type boolean` → noul; `schema.enum N` → choice (criteria from enum
  values); anything else → local error, never sent. State is neutral; each
  question text stays self-contained.
- **D3 — Next moves are generated, not remembered.** `.workflows/queue.json`
  rows `{option, what, effort, risk, unblocks, recommend}`; `closeout.mjs`
  renders the `### Next moves` table from it. Missing queue file renders a
  loud line and trips the settle judge.
- **D4 — Settle judge gains a fifth question.** `decision_brief_present`:
  every open item carries all six columns. Advisory, visible in chat.
- **D5 — DEC-004 records the backend swap.** DEC-001 (single client) holds;
  the backend and key chain are the amendment, recorded in the decision
  index with a revisit condition.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 judge.mjs typesafe backend | task-1.spec | 1 | @model:standard |
| T2 closeout next-moves + 5th question | task-2.spec | 1 | orchestrator-inline |
| T3 docs + queue seed + DEC-004 + release | task-3.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): judge backend swap
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/judge.mjs, tests/judge.test.ts
- **Verify**: bun test tests/judge.test.ts tests/closeout.test.ts

### TASK 2 (Tier B, 🟡): decision brief gate
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/closeout.mjs, tests/closeout-queue.test.ts
- **Verify**: bun test tests/closeout-queue.test.ts

### TASK 3 (Tier A, ⚪): docs + queue + decision + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **tdd**: false
- **Allowed**: prompts/plan.md, README.md, CHANGELOG.md, package.json, .workflows/queue.json, tests/queue-wiring.test.ts
- **Verify**: bun test

## Execution Notes

- TASK 1 ✅ context: no changes — translate/mapAnswers + key chain env→auth.json; ask() signature held (importer tests untouched).
- TASK 2 ✅ context: no changes — queue render + fifth settle question.
- TASK 3 ✅ context: no changes — docs, queue seed, DEC-004, v0.11.0.
- DEVIATION: queue.json is a plain JSON array, not JSONL — because the first cut reused the JSONL reader and wrapped rows — implication: queue stays a JSON array; guarded by closeout-queue tests.
- DEVIATION: Execution Notes markers are written at SHIP, after the settle judge run — because the judge ran on the live plan pre-finalization and correctly flagged empty markers — implication: review.md orders marker writing before the judge call.
- DISCOVERY: auditEntry silently dropped model/usage (fixed-field destructure) — fixed; audit rows now record systemone usage per run.
- DISCOVERY: the settle judge ran live for the first time (1846 input tokens, auth.json key) and immediately caught a real clarity gap — the clarity machinery now has teeth.
- DEFERRED: score-shaped questions (ordered rubrics) unsupported in translate — because no caller needs graded scales yet — implication: future graded gates extend translate with score criteria.

## Docs impact

- `README.md` — judge config (typesafe key chain), close-out Next-moves gate
- `prompts/plan.md` — skip reason names TYPESAFE_API_KEY
- `CHANGELOG.md` — v0.11.0 entry (plan 20261025-029)
- `package.json` — version 0.11.0
