# Plan: Close-out + settle judge (028)

> Plan ID: 20261025-028
> Status: APPROVED 2026-10-25 (owner, session-directed — "i approve"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. The close-out renders
> in the chat, not only in repo files; the settle judge checks it for clarity
> gaps at the boundary, not per reply.

## Context

Deviation and discovery notes land in plan Execution Notes and LOG.md — far
from the conversation the owner reads. Deferrals accumulate across plans with
no cumulative view. The result: the owner cannot see implications without
reading repo files. This plan makes the SHIP close-out a generated, judged,
chat-rendered artifact. Marker convention (Execution Notes):
`- DEVIATION: <what> — because <why> — implication: <impact>`,
`- DISCOVERY: <fact>`,
`- DEFERRED: <item> — <why> — implication: <impact>`.

## Decisions

- **D1 — One generator.** `scripts/closeout.mjs` gathers the live or
  archived plan (tasks, statuses, marker lines), run journal (open
  dispatches), proofs, lessons (untrusted count), and golden case count into
  the fixed sections: Shipped · Deviations · Discoveries · Deferred · Watch.
  `--diagram` adds a mermaid plan-vs-actual block.
- **D2 — Settle judge checks clarity, not code.** `judge` runs one call
  (via `scripts/judge.mjs ask`, injectable) with verify questions:
  deviations complete · implications stated · deferrals named · watch
  present. Findings are advisory; a skipped judge prints loud — advisory,
  never a pass.
- **D3 — Markers are the contract.** Execution Notes lines carry the three
  markers above; the close-out renders only what the markers declare.
  Undeclared deviations are a settle-judge finding target, not a parse
  problem.
- **D4 — Wiring at SHIP.** `/review` Stage 3 gains two lines: generate the
  close-out from the archived bundle, run the settle judge, render both in
  the chat. Reply shape after SHIP = the close-out; no next-task push before
  owner ack.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `closeout.mjs` — gather / render / diagram / settle judge | task-1.spec | 1 | @model:standard |
| T2 SHIP wiring + docs + release | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): close-out generator + settle judge
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/closeout.mjs, tests/closeout.test.ts
- **Verify**: bun test

### TASK 2 (Tier A, ⚪): wiring + docs + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: prompts/review.md, README.md, CHANGELOG.md, package.json, tests/closeout-wiring.test.ts
- **Verify**: bun test

## Execution Notes

- TASK 1 ✅ context: no changes — gather/render/mermaid + settleJudge (4 verify questions, advisory, loud skip); ask injected from judge.mjs.
- TASK 2 ✅ context: no changes — review Stage 3 close-out + settle judge steps; README marker convention; v0.10.2.
- Wave settle (deterministic): 2/2 ok:true; bun test 190/190; golden 11/11, 0 flips.
- DEVIATION: settle judge crashed on first real use — because judge ask() required auditFile while direct importers pass none, and my first fix patched the wrong layer (closeout, not the client) — implication: judge.mjs now defaults the audit file for every importer; found only because the close-out ran for real.
- DISCOVERY: judge ask() is import-safe only when the client defaults its own audit path — contract now: importers may omit auditFile.
- DISCOVERY: the close-out tool caught its own crash on first run — the clarity machinery works on the plan that built it.

## Docs impact

- `README.md` — Close-out section (names report + judge commands)
- `prompts/review.md` — Stage 3 close-out + settle judge steps
- `CHANGELOG.md` — v0.10.2 entry (plan 20261025-028)
- `package.json` — version 0.10.2
