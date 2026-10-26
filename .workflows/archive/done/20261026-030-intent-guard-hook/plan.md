# Plan: Intent-guard suggestion hook (030)

> Plan ID: 20261026-030
> Status: APPROVED 2026-10-26 (owner, session-directed — "run C then D"). Wave 1 in progress.
> Created: 2026-10-26
> Shape: pi-workflows plan (house format). Single repo. The guard suggests;
> it never dispatches, never blocks (023 D5 wired suggest-only).

## Context

Routing today is manual: the owner must remember `/amend` vs task-jump.
`intent-guard.mjs` classifies a query against the live plan (one judge
call) but runs only when invoked by hand. The extension already runs two
`before_agent_start` watchdogs — the hook pattern exists. One blocker:
`classify` asks a number-schema confidence question; the typesafe backend
rejects number schemas, so every live call would skip. System One choice
answers already carry confidence — the separate question goes.

## Decisions

- **D1 — classify speaks systemone natively.** One `kind` question
  (enum: current_spec, amend_needed, unrelated, clarification → choice);
  confidence and probabilities read from the choice answer. Number-schema
  questions are gone. Trail lines gain probabilities.
- **D2 — The hook is suggest-only.** Fires on `before_agent_start` when:
  user message (`messageType === "user"`), non-empty prompt, prompt does
  not start with `/` (explicit commands stay owner-routed), and the live
  plan has tasks. Routes: amend → suggest `/amend`; answer → answer
  directly, do not start tasks; ask → one clarifying question;
  proceed → no message; ask-human (judge unavailable) → no message.
  Never blocks, never rewrites the prompt.
- **D3 — The extension imports the module (DEC-001).**
  `classify`/`planTasks` imported from `scripts/intent-guard.mjs`; failure
  of import or call = fail-open (no message). The hook appends the trail
  line itself.
- **D4 — Queue hygiene at SHIP.** Shipped queue rows leave `queue.json`;
  the next row's recommend becomes `next`.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 classify → systemone shape | task-1.spec | 1 | @model:standard |
| T2 suggestion hook in extension | task-2.spec | 1 | orchestrator-inline |
| T3 docs + queue + release | task-3.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): classify speaks systemone
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/intent-guard.mjs, tests/intent-guard.test.ts
- **Verify**: bun test tests/intent-guard.test.ts

### TASK 2 (Tier B, 🟡): suggestion hook
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: extensions/index.ts, tests/intent-hook.test.ts
- **Verify**: bun test tests/intent-hook.test.ts

### TASK 3 (Tier A, ⚪): docs + queue + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **tdd**: false
- **Allowed**: README.md, CHANGELOG.md, package.json, .workflows/queue.json, tests/intent-wiring.test.ts
- **Verify**: bun test

## Execution Notes

(context markers land here per task on completion — before the settle judge)

- TASK 1 ✅ context: no changes — single kind question; confidence from the choice answer.
- TASK 2 ✅ context: no changes — pure helpers + fail-open registration.
- TASK 3 ✅ context: no changes — README section, queue drop of C, v0.11.1.
- DEVIATION: first header edit mangled the extension doc-comment numbering — because the anchor line matched an existing item — implication: header items 1–6 rewritten cleanly; no code touched.
- DEVIATION: my full-suite check used `tail -2` and hid a real test failure — because the fail line sat above the cut — implication: gate reads now grep pass/fail counts; agent-spec guard had caught it regardless.
- DISCOVERY: classify's number-schema confidence question was incompatible with the typesafe backend — every live call would have skipped; confidence rides the choice answer instead.
- DISCOVERY: guard caught the case-variant ("Suggest-only" vs "suggest-only") and the 029 queue test went stale when 030 dropped the C row — queue tests must assert open rows, not fixed membership.

## Docs impact

- `README.md` — Intent-guard hook section (conditions, routes, fail-open)
- `CHANGELOG.md` — v0.11.1 entry (plan 20261026-030)
- `package.json` — version 0.11.1
