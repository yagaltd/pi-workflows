# Plan: Decision steps + intent-guard (023)

> Plan ID: 20261025-023
> Status: APPROVED 2026-10-25 (owner, session-directed — "run 023"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Both features ride
> `scripts/judge.mjs` `ask()` — no second judge client (022 D5 reservation).

## Context

Flows (022) dispatch and gate; decisions still need a human or the leader
model. This plan adds the two typed-decision surfaces from the borrow map:
(1) flow `decision` steps — one calibrated call per step, answers recorded,
assertions on confidence; (2) the intent-guard — a pre-dispatch classify of a
query against the live plan, routing proceed / amend / answer / ask. Both
degrade loudly when the judge is unavailable; thresholds come from config,
never from vibes.

## Decisions

- **D1 — One judge client.** Both features import `ask()` from
  `scripts/judge.mjs`; verdict rows are `{id, verdict, confidence?}`.
  No new HTTP code.
- **D2 — Decision steps in flows.** `kind: "decision"` carries `questions`
  (`{id, prompt, kind: choose|rate|verify|probability, options?|levels?}`)
  and optional `assert` (`{question, equals|in|min_confidence}`). Answers
  land in the run report and flow state. Unavailable judge ⇒ step status
  `skipped` (documented gap); unmet assert ⇒ step `fail`.
- **D3 — Intent-guard routes, never dispatches.**
  `scripts/intent-guard.mjs --query "..."` classifies against the live plan:
  `proceed` (related ≥ threshold) · `amend` · `answer` · `ask`. Guard skips
  ⇒ `ask-human` (current behavior). Fail-open by design; every verdict
  appends to `.workflows/intent/trail.jsonl`.
- **D4 — Thresholds are config.** `--threshold` (default 0.85), read at
  call time — never baked into code.
- **D5 — Extension wiring deferred.** v1 ships the CLI + module surface;
  hooking `before_agent_start` is a follow-up once the routing is trusted.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 Flow decision steps (validator + runner + stub-tested) | task-1.spec | 1 | @model:standard |
| T2 Intent-guard CLI | task-2.spec | 1 | @model:standard |
| T3 Docs + example + release | task-3.spec (needs T1+T2) | 2 | orchestrator-inline Tier A |

## Tasks

[PARALLEL-GROUP: wave-one]

### TASK 1 (Tier B, 🟡): flow decision steps
- **Status**: ⬜ PENDING
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/flow-decision.mjs, scripts/flow-schema.mjs, scripts/flow-validate.mjs, scripts/flow-run.mjs, tests/flows-decision.test.ts
- **Verify**: bun test

### TASK 2 (Tier B, 🟡): intent-guard CLI
- **Status**: ⬜ PENDING
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/intent-guard.mjs, tests/intent-guard.test.ts
- **Verify**: bun test

### TASK 3 (Tier A, ⚪): docs + example + release
- **Status**: ⬜ PENDING
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **tdd**: false
- **Allowed**: .workflows/flows/, skills/flows/, README.md, CHANGELOG.md, package.json, tests/decision-docs.test.ts
- **Verify**: bash scripts/check-drift.sh && bash scripts/docs-lint.sh

## Execution Notes

- TASK 1 ✅ context: no changes — runDecisionStep + judgeQuestions; verdict rows {id, verdict, confidence}; assert equals/in/min_confidence.
- TASK 2 ✅ context: no changes — classify + routeFor + trail provenance; plan task titles feed the classify question.
- TASK 3 ✅ context: no changes — decision-demo example; skill restructured (decision + intent-guard sections); v0.9.1.
- Wave settle (deterministic): 3/3 ok:true; bun test 160/160; golden 11/11, 0 flips.

## Docs impact

- `README.md` — decision steps + intent-guard paragraphs (name the gates)
- `skills/flows/SKILL.md` — decision kind + intent-guard usage
- `CHANGELOG.md` — v0.9.1 entry (plan 20261025-023)
- `package.json` — version 0.9.1
