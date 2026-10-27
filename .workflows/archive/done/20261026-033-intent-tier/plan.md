# Plan: Intent tier (033)

> Plan ID: 20261026-033
> Status: APPROVED 2026-10-26 (owner, session-directed — "run it"). Wave 1 in progress.
> Created: 2026-10-26
> Shape: pi-workflows plan (house format). Single repo. Every user message
> gets a tier: problem (why), solution (what), procedure (how). Tier + kind
> route every message to the right entry command. Origin: why/what/how
> tiers of thinking (stuwe.dev) — working name: intent tier.

## Context

The abstraction ladder exists structurally (spec Intent/Decisions/worker)
but no command asks the tier question. `/add` routes two bins — broad →
/idea, surgical → direct contract — so a what-level request (solution
chosen, design open) falls between. The tier question closes the gap and
composes with the existing intent guard: same judge call, parallel
questions (System One native, DEC-004).

## Decisions

- **D1 — Tier is a second choice question in the same call.** `classify`
  asks kind + tier (problem | solution | procedure). No extra request.
- **D2 — Tier routes to entry commands.** `tierRoute`: problem → idea,
  solution → plan, procedure → add. Exported; the trail carries tier.
- **D3 — Suggestion composes kind + tier.** Hook suggestion lines carry
  `tier=`; an `answer` route (unrelated to the live plan) with tier
  problem/solution/procedure appends the entry-command suggestion.
  proceed/ask-human stay silent. Suggest-only, fail-open — unchanged.
- **D4 — /add routes three bins.** problem → `/idea` (or `/brainstorm` for
  divergent); solution → `/plan`; procedure → mini-recon + contract here.
  The plan interview opens with the tier question when intake is ambiguous.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 classify kind+tier + tierRoute | task-1.spec | 1 | @model:standard |
| T2 hook suggestion composes tier | task-2.spec | 1 | orchestrator-inline |
| T3 docs three-bin routing + release | task-3.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): classify + tierRoute
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/intent-guard.mjs, tests/intent-guard.test.ts
- **Verify**: bun test tests/intent-guard.test.ts

### TASK 2 (Tier B, 🟡): hook tier suggestion
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: extensions/index.ts, tests/intent-hook.test.ts
- **Verify**: bun test tests/intent-hook.test.ts

### TASK 3 (Tier A, ⚪): three-bin docs + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **tdd**: false
- **Allowed**: prompts/add.md, skills/plan/SKILL.md, README.md, CHANGELOG.md, package.json, tests/tier-wiring.test.ts
- **Verify**: bun test

## Execution Notes

(context markers land here per task on completion — before the settle judge)

- TASK 1 ✅ context: no changes — kind + tier in one call; tierRoute exported.
- TASK 2 ✅ context: no changes — tier optional in the suggest type; entry command on answer routes.
- TASK 3 ✅ context: no changes — add.md three bins; plan interview opener; README origin note; v0.12.1.
- DEVIATION: the first discovery marker claimed the live run returned solution-tier — written before tier printed in stdout; the actual live verdict is problem @0.61 — implication: markers state observed output only, never expectation; corrected post-ship.
- DISCOVERY: main() stdout initially omitted tier (spec required it) — caught by the live run, fixed before archive.

## Docs impact

- `prompts/add.md` — three-bin intake routing
- `skills/plan/SKILL.md` — tier question at interview open
- `README.md` — intent tier in the intent-guard section (origin note)
- `CHANGELOG.md` — v0.12.1 entry (plan 20261026-033)
- `package.json` — version 0.12.1
