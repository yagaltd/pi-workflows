# Plan: 080 — WIP batch gate

> Plan ID: 20261122-080
> Created: 2026-11-22
> Status: DONE
> Owner: Aurel
> Scope: WIP batch state, emit/consume wiring, gate enforcement, dispatch block

## Intent

Stop dirty-tree accumulation and unshipped work from being invisible. A
tracked WIP batch state makes the active fix/feature explicit from STOP to
SHIP. Verdict and scope proof are required before the final commit.

## Context

- the fix skill stops before commit but emits no machine-readable batch identity.
- the review skill SHIP commits and archives without a WIP verdict/scope check.
- the refactor skill has per-step commit advice that contradicts its later STOP.
- `pre-commit` and `mise run ci` share `scripts/check-drift.sh`.
- `scripts/wf.sh` is the single launcher behind `.mise/tasks/*`.
- `/init` generates namespaced `wf:*` tasks without touching root mise config.
- `dispatchNext` is read-only; watchdogs remain advisory.
- Plan 076 is archived DONE; 077-079 are shipped; persona is committed.

## Decisions

- **WIP identity is tracked state**: .workflows/wip/<batch>.json is the
  source of truth. Commit trailers are linkage only.
- **the fix skill emits at STOP**: no agent commits; the human approves the commit.
- **the review skill consumes with proof**: final `ok:true` verdict and scope
  containment are required before SHIP.
- **One gate point**: check-drift section 13 (`wip`) is consumed by
  pre-commit and `mise run ci`. check-tree stays WARN.
- **mise is the command surface**: `.mise/tasks/wip` wraps `scripts/wf.sh`.
- **Dispatcher blocks, watchdogs stay advisory**: no new prompt watchdog.
- **Out of scope**: ADR lint, archive-history refactor, persona content,
  consumer CI rewrites.

## Refactor assessment (mandatory)

- **Scan**: the fix skill, the review skill, the refactor skill, pre-commit, `mise run ci`, and
  `dispatchNext` partly cover the flow. No WIP parser or state dir exists.
- **Verdict**: `extend` — one parser, one state whitelist, one check-drift
  section, one mise task, one init task, thin flow wiring.
- **Block rule**: if an existing WIP gate contradicts this, stop and escalate.

## Docs impact (mandatory)

Docs impact:
- `docs/architecture.md` — add the WIP lifecycle and single gate surface.
- `docs/canon.md` — place WIP state under the .workflows/wip state directory; it is not a
  new plan/spec/review type.
- CHANGELOG: v0.15.18 — WIP batch gate: executable WIP identity, the fix skill
  emit, the review skill verdict+scope consume, the refactor skill commit resolution,
  pre-commit/mise-ci and dispatcher blocks — plan 20261122-080.

`README.md` stays neutral: no command table change is required.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing | Wave | Depends On |
|------|-------|------|------------|---------|------|------------|
| TASK 1 | worker | WIP parser + command wiring | 🔴 BLOCKING | example-based | 1 | — |
| TASK 2 | worker | the fix skill emits WIP | ⚪ STANDARD | prompt pin | 2 | TASK 1 |
| TASK 3 | worker | the review skill consumes proof | 🟠 VERIFICATION_HEAVY | fixtures | 2 | TASK 1 |
| TASK 4 | worker | the refactor skill WIP commits | ⚪ STANDARD | prompt pin | 2 | TASK 1 |
| TASK 5 | worker | check-drift + pre-commit | 🟠 VERIFICATION_HEAVY | fixture | 2 | TASK 1 |
| TASK 6 | worker | Dispatcher WIP block | 🟠 VERIFICATION_HEAVY | fixture | 3 | TASK 1 |
| TASK 7 | worker | Docs + mise/init pins | ⚪ STANDARD | docs-lint | 4 | TASK 2-6 |

## Tasks

### TASK 1 (Tier B 🔴): Build WIP state parser and command wiring
- **Agent**: worker
- **Depends On**: none
- **Wave**: 1
- **Contract path**: `.workflows/specs/task-1.spec`
- **Allowed**: scripts/wip.mjs, tests/wip.test.ts, scripts/wf.sh, .mise/tasks/wip, .gitignore
- **Verify**: bun test tests/wip.test.ts && node scripts/wip.mjs status --repo .
- **Status**: ✅ DONE

### TASK 2 (Tier B ⚪): the fix skill emits WIP state at STOP
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract path**: `.workflows/specs/task-2.spec`
- **Allowed**: skills/fix/SKILL.md, tests/fix-wip.test.ts
- **Verify**: bun test tests/fix-wip.test.ts
- **Status**: ✅ DONE

### TASK 3 (Tier B 🟠): the review skill consumes verdict and scope
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract path**: `.workflows/specs/task-3.spec`
- **Allowed**: skills/review/SKILL.md, tests/review-wip.test.ts
- **Verify**: bun test tests/review-wip.test.ts
- **Status**: ✅ DONE

### TASK 4 (Tier B ⚪): the refactor skill WIP state resolves commit contradiction
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract path**: `.workflows/specs/task-4.spec`
- **Allowed**: skills/refactor/SKILL.md, tests/refactor-wip.test.ts
- **Verify**: bun test tests/refactor-wip.test.ts
- **Status**: ✅ DONE

### TASK 5 (Tier B 🟠): check-drift §13 and pre-commit validation
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract path**: `.workflows/specs/task-5.spec`
- **Allowed**: .githooks/pre-commit, scripts/check-drift.sh, tests/wip-gate.test.ts
- **Verify**: bun test tests/wip-gate.test.ts && bash scripts/check-drift.sh --only wip
- **Status**: ✅ DONE

### TASK 6 (Tier B 🟠): Dispatcher blocks active WIP
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 3
- **Contract path**: `.workflows/specs/task-6.spec`
- **Allowed**: extensions/index.ts, tests/wip-dispatch.test.ts
- **Verify**: bun test tests/wip-dispatch.test.ts tests/extension.test.ts
- **Status**: ✅ DONE

### TASK 7 (Tier B ⚪): Docs and mise/init surface pins
- **Agent**: worker
- **Depends On**: TASK 2, TASK 3, TASK 4, TASK 5, TASK 6
- **Wave**: 4
- **Contract path**: `.workflows/specs/task-7.spec`
- **Allowed**: docs/architecture.md, docs/canon.md, scripts/init-extract.ts, skills/init/SKILL.md, tests/wip-docs.test.ts, tests/mise-tasks.test.ts
- **Verify**: bun test tests/wip-docs.test.ts tests/mise-tasks.test.ts && bash scripts/docs-lint.sh
- **Status**: ✅ DONE

## Ledger Resolution

| Item | Disposition | Note |
|------|-------------|------|
| Stale live plan 076 | done(commit ba56bc5) | archived as DONE |
| Persona files | done(commit 9485def) | owner-authored |
| justfile removal | done(commit 75161c8) | mise is current surface |
| Archive-count id rule | deferred(trigger: separate bookkeeping plan) | unrelated |
| ADR lint/allocator | deferred(trigger: separate plan) | owner scope |

## Execution Notes

- Adversarial pass rejected commit trailers as WIP source of truth.
- Resource rule applies before every test suite.
- Depends On edges derived by hand; owner approved them with plan execution.
- No production implementation is authored by the orchestrator.
