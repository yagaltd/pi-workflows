# Plan 20261031-048 — evidence-independence verdict (kwant port)

> Plan ID: 20261031-048

**Status:** DONE (shipped 20261102 — v0.14.2; whole-plan review PASS after fix round; reviews/task-1..3.md)
**Evidence:** kwant `src/server/missions/mod.rs:359-381` (independence rule + test), `foundry.rs:636,:939` (replayable-kind rule + test); our `scripts/proof-ledger.mjs` (record/verify/collect with outputHash replay) and `.workflows/proofs/proofs.jsonl` rows `{ts, planId, taskId, command, exit, outputHash, specHash?}` — **no runner field, no verdict computation**.
**Intent:** port kwant's two rules onto the existing proof ledger: a task's evidence passes only if ≥1 check is (a) run by someone other than the task owner and (b) replayable-confirmed. Self-attested and unreplayable evidence can no longer green-light a task.

## Docs impact
- `scripts/proof-ledger.mjs` — runner + kind fields, verdict functions (code, not docs — listed for check-archive completeness)
- `prompts/verify.md` — reviewers record their own probes as proofs (`--runner reviewer`)
- `skills/review/SKILL.md` — one line: evidence verdict computed at review
- `CHANGELOG.md` — v0.14.2 entry at SHIP

## Decisions
1. **Runner taxonomy**: `worker | reviewer | orchestrator` — passed via `--runner` at record time; default `worker`. Historical rows without a runner read as `worker` (not independent) — forward-only enforcement, old plans unaffected.
2. **Kind taxonomy (kwant-aligned)**: `replayable-confirmed` (verify re-run matches outputHash) · `replayable-drifted` (re-ran, hash differs → failed) · `not_replayable` (cannot re-run — prose, one-shot, outside-sandbox). Ported rule: unreplayable never counts as passed; all-unreplayable → `not_checked`.
3. **Verdict rule (ported 1:1)**: `passed` requires ≥1 independent (`runner != task owner`) replayable-confirmed passed check; only-owner checks → `not_independent`; else per kwant fail/waiting semantics.
4. **Enforcement points**: verify prompt (reviewer records own probes as proofs) + flow-gates `evidence` gate (aggregates per task at review). Upstream agent-spec untouched.
5. **ASSUMPTION (veto at gate)**: runner attribution is dispatcher-supplied (orchestrator sets `--runner worker`; reviewer packs carry `--runner reviewer`). Trust boundary = same as kwant's self-reported `checked_by`; the person approval path is the human review gate.
6. Reviewer authority unchanged — this adds a mechanical layer UNDER the prose ("borrowed evidence is not evidence" becomes computed).

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | proof-ledger: runner + kind + verdict functions (TDD) | 🟠 VERIFICATION_HEAVY | property/example-based | 1 | — |
| TASK_2 | worker | integration: evidence gate + reviewer probe recording + docs | ⚪ | example-based | 2 | TASK_1 |

## Tasks

### TASK 1 (Tier B, 🟠): proof-ledger verdict functions (TDD)
- **Agent**: worker (tester-style — write tests first)
- **Depends On**: none
- **Wave**: 1
- **Allowed**: scripts/proof-ledger.mjs, tests/proof-ledger.test.ts, tests/proof-verdict.test.ts (new)
- **Contract**: .workflows/specs/task-1.spec
- **What**: (a) `record` gains `--runner` → row field `runner`. (b) `verify` classifies: replayable-confirmed / replayable-drifted / not_replayable (command cannot re-run in a fresh cwd). (c) Pure exported `exampleVerdict(checks)` (kwant 1:1: passed/not_checked/failed) and `evidenceVerdict(owner, checks)` (independence rule: passed requires ≥1 independent replayable-confirmed check; only-owner → not_independent). (d) Port kwant's test `verdicts_never_count_unreplayable_checks_as_passed` plus independence cases — TDD: tests first, red, then implement.
- **Verify**: `bun test tests/proof-verdict.test.ts tests/proof-ledger.test.ts` — all pass; kwant port cases 1:1
- **Status**: ✅ DONE (verdict ok:true, reviews/task-1.md; merged b0b1bd8; kwant fidelity + purity + no-weakening pass)
- context: proof rows gain runner/replayable; exampleVerdict + evidenceVerdict ported 1:1 (origin: kwant missions/foundry)
- [PARALLEL-GROUP: SOLO]

### TASK 2 (Tier B, ⚪): integration — evidence gate + reviewer recording
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Allowed**: scripts/flow-gates.mjs, prompts/verify.md, skills/review/SKILL.md
- **Contract**: .workflows/specs/task-2.spec
- **What**: (a) flow-gates gains an `evidence` gate: runs `proof-ledger verify --plan <id> --task <t>` per task → maps to verdict; not_independent → gate FAIL with "no independent replayable check". (b) prompts/verify.md Layer 1 gains: reviewer records each probe as `proof-ledger record --runner reviewer`. (c) review SKILL one line: evidence verdict is computed; reviewer probes must be recorded proofs. (d) Origin note in proof-ledger header (origin: kwant missions/foundry).
- **Verify**: flow-gates evidence gate — independent replayable row → pass; only-owner rows → fail "not_independent"; not_replayable-only → fail "not_checked"; `just ci-lite` exit 0
- **Status**: ✅ DONE (verdict ok:true, reviews/task-2.md; merged de3f62d; scenario-3 deviation named — not_checked reserved for zero-counted proofs)
- context: evidence gate computed from recorded proofs; reviewer probes recorded via --runner reviewer. DEVIATION: origin note landed in flow-gates.mjs header (proof-ledger.mjs is TASK 1's boundary, not TASK 2's)

(No verify/quality tasks in plan: `/next` verdict-gates every task automatically; `/review` is the final gate at SHIP.)

## Risks
- 🟠 TASK 1: verdict semantics must match kwant 1:1 — reviewer checks against the kwant source lines cited in Evidence.
- 🟡 Runner attribution is dispatcher-supplied (Decision 5 assumption) — documented trust boundary; human review gate is the backstop.

## Backlog note
Rows 1–2 (guard skip-aware route, guard rollout docs) remain queued separately — this plan does not touch them.

### TASK 3 (Tier B, 🟠): evidence-gate completion fix round (bug-hunter findings verbatim)
- **Agent**: worker
- **Depends On**: TASK 2
- **Wave**: 3
- **Allowed**: scripts/flow-schema.mjs, scripts/flow-validate.mjs, scripts/flow-run.mjs, scripts/flow-gates.mjs, scripts/proof-ledger.mjs, tests/proof-verdict.test.ts, tests/proof-ledger.test.ts, tests/flows-validate.test.ts, tests/flows-run.test.ts
- **What**: BUG-1 GATE_NAMES += evidence + gate-step taskId field (flow-run passes it to runGate; flow-validate accepts); BUG-2 evidenceGate filters planId + taskId; BUG-3 verifyLast restores recorded-exit comparison (replay-confirmed requires exit match); BUG-4 --kind validates ∈ {replayable, not_replayable} else usage error exit 2 (fail-closed). bun tests for each.
- **Verify**: `bun test tests/proof-verdict.test.ts tests/proof-ledger.test.ts tests/flows-validate.test.ts tests/flows-run.test.ts` all pass + bug-hunter probe cases 1:1 (cross-plan borrowing rejected; recorded-fail replay → not replayable-confirmed; typo kind → usage error)
- **Status**: ✅ DONE (fix round run_mvz21ewb_co3bky; reviewer ok:true, reviews/task-3.md; merged 5dc360b)
- context: BUG-1..4 fixed (gate reachable via flows, planId scoping, recorded-exit replay, --kind fail-closed); spec persisted post-hoc from inline prompt
