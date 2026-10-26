# Plan: Format chooser (032)

> Plan ID: 20261026-032
> Status: APPROVED 2026-10-26 (owner, session-directed — "run F"). Wave 1 in progress. E (anews pack) CANCELLED by owner same message.
> Created: 2026-10-26
> Shape: pi-workflows plan (house format). Single repo. The chooser
> mechanizes the output ladder: prose is rung 1; a visual artifact is
> earned, suggested, and audited — never assumed.

## Context

Owner decision: outputs for human decisions need the right artifact, not
always prose. diagram-design (installed skill) carries 45 visual types, a
semantic-pattern router, and its own selection doctrine ("would the reader
learn more than from prose?"). The chooser turns that doctrine into two
advisory Jev questions at decision boundaries. Markmap retires from
/brainstorm: the ledger stays markdown; visuals generate at graduation.

## Decisions

- **D1 — Two questions, one call.** Q1 `artifact`: choice
  none/table/mermaid/html — the ladder itself; `none` is a first-class
  answer and the default. Q2 `type`: choice over semantic-pattern groups
  (bottleneck→data-flow, decision-logic→flowchart, states→state-machine,
  hierarchy→tree, cycle→loop, positioning→quadrant, events→timeline,
  components→architecture, quantity-flow→sankey, other→agent picks from
  the 45-type guide). Q2 is speculative: asked in the same call, consumed
  only when Q1 picks a visual; the premise is stated in the question.
- **D2 — Boundaries are a closed set.** closeout · plan-approval ·
  challenge · brainstorm-graduation. Nowhere else.
- **D3 — Advisory, audited, fail-open.** Skipped judge ⇒ loud
  `FORMAT CHOOSER SKIPPED` + default `none` (prose). Verdicts land in the
  judge audit (automatic). The chooser suggests; the agent decides and may
  overrule with a stated reason.
- **D4 — HTML is a generated view.** Never hand-edited, never a gate,
  regenerable from the md source. Gates stay mechanical text.
- **D5 — Markmap retired.** The research ledger stays markdown (source of
  truth). At graduation the chooser decides the artifact; concept views
  generate via diagram-design types (tree/loop/nested). No markmap tooling
  rules remain.
- **D6 — DEC-005 records the doctrine.** Queue drops E (cancelled) and F
  (this plan ships); an empty queue is a valid state.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 format-chooser.mjs engine | task-1.spec | 1 | @model:standard |
| T2 wiring + markmap retirement + queue + release | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): chooser engine
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/format-chooser.mjs, tests/format-chooser.test.ts, .workflows/evals/golden/chooser-001-advisory-degrade.json
- **Verify**: bun test tests/format-chooser.test.ts

### TASK 2 (Tier A, ⚪): wiring + retirement + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: prompts/review.md, skills/plan/SKILL.md, skills/challenge/SKILL.md, skills/brainstorm/SKILL.md, skills/brainstorm/references/ledger-format.md, prompts/brainstorm.md, README.md, CHANGELOG.md, package.json, .workflows/queue.json, .workflows/decisions/, tests/chooser-wiring.test.ts
- **Verify**: bun test

## Execution Notes

(context markers land here per task on completion — before the settle judge)

- TASK 1 ✅ context: no changes — two questions, one call; fail-open none; advisory note on every result.
- TASK 2 ✅ context: no changes — four boundaries wired; markmap retired everywhere; DEC-005; E cancelled; v0.12.0.
- DEVIATION: three of my own test edits were sloppy — a bogus expect().catch chain, a README phrase asserted before checking the exact wording, and a python replacement that dropped a closing paren — because I wrote assertions against intended text instead of the written text — implication: every one was caught by the gates before SHIP; nothing shipped broken.
- DISCOVERY: the live chooser on this plan's close-out returned artifact=none @0.61 — prose stands; the tool obeys its own default on its own plan.
- DISCOVERY: golden case chooser-001 encodes the advisory degrade (mode advisory, proceed, documented gap) — the runner needed no change.

## Docs impact

- `README.md` — Format chooser section
- `prompts/review.md` — Stage 3 chooser step
- three skills + brainstorm prompt — chooser step, markmap retired
- `CHANGELOG.md` — v0.12.0 entry (plan 20261026-032)
- `package.json` — version 0.12.0
