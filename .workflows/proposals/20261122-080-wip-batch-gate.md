# Proposal — WIP batch gate

> Plan ID: 20261122-080 (owner-assigned)
> Created: 2026-11-22
> Status: DRAFT
> Scope: pi-workflows — WIP batch state, emit/consume wiring,
> gate enforcement, dispatcher block, mise tasks, docs
> Source: `.workflows/scout/20261122-080-wip-batch-gate.md`

## Lifecycle

- This file is a proposal only. No live plan exists.
- Plan 076 was archived as DONE after its three phases shipped.
- Plans 077, 078, and 079 shipped as v0.15.15, v0.15.16, v0.15.17.
- Plan ID 080 follows the highest shipped ID. The archive-count rule is a
  separate bookkeeping defect; resolving it is not part of this plan.
- The persona files are committed. They are outside this plan's scope.

## Context

- `/fix` Phase 9 stops before commit and hands the human a message template.
  It emits no machine-readable in-progress identity.
- `/review` SHIP commits and archives. It does not check whether the work has
  a final verdict or stayed inside the task scope.
- `/refactor` still contains per-step commit advice that conflicts with its
  later STOP/keep-or-rollback decision.
- `pre-commit` and `mise run ci` share `scripts/check-drift.sh`. That is the
  single fail-tier gate surface. `scripts/check-tree.mjs` stays WARN.
- The mise conversion replaced the justfile with `.mise/tasks/*`.
  `scripts/wf.sh` is the single launcher behind those tasks.
- `/init` generates namespaced `wf:*` tasks in a consumer repo's
  `mise/conf.d/pi-workflows.toml`. It never edits the repo root `mise.toml`.
- `dispatchNext` is read-only. `before_agent_start` handlers are advisory.

## Sieve

| Cell | Verdict |
|---|---|
| V value | `must-have` |
| R risk | `serious` |
| E effort | `s` |
| path | `none` |

Outcome: propose.

## Decisions

- **WIP identity is tracked state, not a commit-trailer convention**:
  `.workflows/wip/<batch>.json` is the source of truth. Required fields are
  `id`, `kind`, `scope`, `root_cause`, `verdict`, `status`, `created_at`.
  One parser (`scripts/wip.mjs`) owns `start`, `status`, `ready`, `ship`,
  `verify`, and `message`. Commit trailers are optional linkage only.
  - `Cost of inaction:` a dirty tree stays indistinguishable from drift.
  - `Blast radius:` parser +, `.gitignore` +, tests +, gates +,
    mise tasks +, dispatcher +; docs neutral.
- **`/fix` emits WIP state at STOP and never commits**: Phase 9 keeps the
  human approval stop. It writes WIP state with the fix's Allowed Changes as
  `scope` and `status: awaiting-review`.
  - `Cost of inaction:` a fix lands before review evidence exists.
  - `Blast radius:` `/fix` +, `/review` +, pre-commit +, dispatcher +.
- **`/review` consumes WIP only with verdict and scope proof**: before SHIP,
  it runs `scripts/wip.mjs verify`, requires `ok:true` verdicts for every task
  in the batch, requires changed code files to be inside `scope`, then calls
  `ship`. Failure blocks SHIP and names the missing proof.
  - `Cost of inaction:` SHIP can commit unreviewed or out-of-scope work.
  - `Blast radius:` `/review` +, verdict files read-only +, docs +.
- **`/refactor` per-step commits become WIP state**: rollback value stays.
  The keep/rollback decision remains human. Final commit remains `/review`'s.
  - `Cost of inaction:` one flow tells agents both to commit and to wait.
  - `Blast radius:` `/refactor` +, `/review` +.
- **One gate point, two consumers**: add check-drift section 13 (`wip`)
  with a `--only wip` fixture seam. Pre-commit validates commit linkage and
  then execs check-drift. `mise run ci` inherits the section. No second gate.
  - `Cost of inaction:` pre-commit and CI drift into different definitions.
  - `Blast radius:` `scripts/check-drift.sh` +, `.githooks/pre-commit` +.
- **mise is the command surface**: add `.mise/tasks/wip` as a thin wrapper
  over `scripts/wf.sh wip`. Add `wf:wip` to the generated init fragment.
  Do not recreate a justfile or put workflow logic in mise config.
  - `Cost of inaction:` WIP checks exist but are not reachable uniformly.
  - `Blast radius:` `.mise/tasks/wip` +, `scripts/wf.sh` +,
    `scripts/init-extract.ts` +, init tests +.
- **Dispatcher blocks, watchdogs stay advisory**: `dispatchNext` returns
  `ok:false, blocked:"wip-active"` before task selection when WIP is active.
  No third `before_agent_start` handler is added.
  - `Cost of inaction:` a new wave starts on an unconsumed batch.
  - `Blast radius:` `extensions/index.ts` +, dispatcher callers +.
- **Out of scope**: ADR lint/allocator, archive-history refactor, persona
  content, and consumer repo CI/CI task rewrites are separate work.
  - `Cost of inaction:` none in-scope.
  - `Blast radius:` out-of-scope paths stay untouched.

## Refactor assessment (mandatory)

- **Scan**: the need is partly covered by `/fix` STOP, `/review` SHIP,
  `/refactor` STOP, `pre-commit`, `mise run ci`, and read-only `dispatchNext`.
  No WIP parser or state directory exists.
- **Verdict**: `extend` — one parser, one state whitelist, one check-drift
  section, one mise task, one init task, and thin wiring into existing flows.
- **Block rule**: if an existing WIP gate or format is found, stop and
  escalate. Do not absorb silent overlap.

## Docs impact (mandatory)

Docs impact:
- `docs/architecture.md` — add the WIP lifecycle and single gate surface.
- `docs/canon.md` — place WIP state under `.workflows/wip/**`, not as a new
  plan/spec/review type.
- CHANGELOG: v0.15.18 — WIP batch gate: executable WIP identity, `/fix`
  emit, `/review` verdict and scope consume, `/refactor` commit resolution,
  pre-commit/mise-ci and dispatcher blocks — plan 20261122-080.

`README.md` stays neutral: no command table change is required.

## Exploration

- Scout artifact: `.workflows/scout/20261122-080-wip-batch-gate.md`.
- Current gate surface: `pre-commit` → `scripts/check-drift.sh`;
  `mise run ci` → the same drift script plus docs/agents/tests.
- Current command surface: `.mise/tasks/*` file tasks over `scripts/wf.sh`.
- Current init surface: generated `mise/conf.d/pi-workflows.toml` with
  namespaced `wf:*` wrappers.
- Dispatcher remains read-only. Watchdogs remain advisory.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK 1 | worker | Build WIP state parser and command wiring | 🔴 BLOCKING | example-based | 0 | — |
| TASK 2 | worker | `/fix` emits WIP state at STOP | ⚪ STANDARD | prompt text pin | 1 | TASK 1 |
| TASK 3 | worker | `/review` consumes verdict + scope | 🟠 VERIFICATION_HEAVY | fixture verdicts + diff | 1 | TASK 1 |
| TASK 4 | worker | `/refactor` commits become WIP | ⚪ STANDARD | prompt text pin | 1 | TASK 1 |
| TASK 5 | worker | check-drift §13 + pre-commit validation | 🟠 VERIFICATION_HEAVY | `--only wip` fixture | 1 | TASK 1 |
| TASK 6 | worker | Dispatcher blocks on active WIP | 🟠 VERIFICATION_HEAVY | dispatch fixture | 2 | TASK 1 |
| TASK 7 | worker | Docs + mise/init surface pins | ⚪ STANDARD | docs-lint + text pins | 3 | TASK 2-6 |

Wave execution: TASK 1 → TASK 2 + TASK 3 + TASK 4 + TASK 5 → TASK 6 →
TASK 7 → `/review`. No separate verify or review tasks.

## Tasks

### TASK 1 (Tier B 🔴): Build WIP state parser and command wiring
- **Agent**: worker
- **Depends on**: none
- **Contract**: `.workflows/specs/task-wip-identity.spec`
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **Allowed Changes**: `scripts/wip.mjs`, `tests/wip.test.ts`,
  `scripts/wf.sh`, `.mise/tasks/wip`, `.gitignore`
- **Forbidden**: everything else.
- **What**: implement `start`, `status`, `ready`, `ship`, `verify`, and
  `message`. Track state under `.workflows/wip/**`. Whitelist that directory.
  Add the `wip` verb to the launcher and a thin `.mise/tasks/wip` wrapper.
- **Verify**: `bun test tests/wip.test.ts && mise run wip status`

### TASK 2 (Tier B ⚪): `/fix` emits WIP state at STOP
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: `[PARALLEL-GROUP: A]`
- **Contract**: `.workflows/specs/task-fix-wip-emit.spec`
- **Allowed Changes**: `skills/fix/SKILL.md`, `tests/fix-wip.test.ts`
- **Forbidden**: all other paths.
- **What**: add the WIP start command to Phase 9. Keep the STOP verbatim.
  Add no agent-commit instruction.
- **Verify**: `bun test tests/fix-wip.test.ts`

### TASK 3 (Tier B 🟠): `/review` consumes verdict and scope before SHIP
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: `[PARALLEL-GROUP: A]`
- **Contract**: `.workflows/specs/task-review-wip-consume.spec`
- **Allowed Changes**: `skills/review/SKILL.md`,
  `tests/review-wip.test.ts`
- **Forbidden**: all other paths.
- **What**: insert the WIP verify before the SHIP commit. Require final
  `ok:true` verdicts and in-scope changed files. Call `ship` on success.
- **Verify**: `bun test tests/review-wip.test.ts`

### TASK 4 (Tier B ⚪): `/refactor` WIP state resolves commit contradiction
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: `[PARALLEL-GROUP: A]`
- **Contract**: `.workflows/specs/task-refactor-wip-commits.spec`
- **Allowed Changes**: `skills/refactor/SKILL.md`,
  `tests/refactor-wip.test.ts`
- **Forbidden**: all other paths.
- **What**: replace per-step commit advice with WIP state plus human
  approval. Keep Phase 4 STOP. Final commit stays with `/review`.
- **Verify**: `bun test tests/refactor-wip.test.ts`

### TASK 5 (Tier B 🟠): check-drift §13 and pre-commit validation
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: `[PARALLEL-GROUP: A]`
- **Contract**: `.workflows/specs/task-wip-gate-wiring.spec`
- **Allowed Changes**: `.githooks/pre-commit`,
  `scripts/check-drift.sh`, `tests/wip-gate.test.ts`
- **Forbidden**: all other paths.
- **What**: add fail-tier WIP section and `--only wip` fixture seam.
  Validate commit linkage in pre-commit. `mise run ci` inherits it.
- **Verify**: `bun test tests/wip-gate.test.ts &&
  bash scripts/check-drift.sh --only wip`

### TASK 6 (Tier B 🟠): Dispatcher blocks active WIP
- **Agent**: worker
- **Depends on**: TASK 1
- **Contract**: `.workflows/specs/task-wip-dispatch-block.spec`
- **Allowed Changes**: `extensions/index.ts`,
  `tests/wip-dispatch.test.ts`
- **Forbidden**: all other paths.
- **What**: return `blocked:"wip-active"` before task selection when WIP is
  active. Keep `readOnlyHint: true`. Add no watchdog.
- **Verify**: `bun test tests/wip-dispatch.test.ts tests/extension.test.ts`

### TASK 7 (Tier B ⚪): Docs and mise/init surface pins
- **Agent**: worker
- **Depends on**: TASK 2, TASK 3, TASK 4, TASK 5, TASK 6
- **Contract**: `.workflows/specs/task-wip-docs.spec`
- **Allowed Changes**: `docs/architecture.md`, `docs/canon.md`,
  `scripts/init-extract.ts`, `skills/init/SKILL.md`,
  `tests/wip-docs.test.ts`, `tests/mise-tasks.test.ts`
- **Forbidden**: all other paths.
- **What**: document the lifecycle. Add `wf:wip` to the generated init
  fragment. Pin emit/consume/block strings. Do not edit CHANGELOG.
- **Verify**: `bun test tests/wip-docs.test.ts tests/mise-tasks.test.ts &&
  bash scripts/docs-lint.sh`

## Contracts (generated after approval)

| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 1 | `.workflows/specs/task-wip-identity.spec` | state, verify, message |
| TASK 2 | `.workflows/specs/task-fix-wip-emit.spec` | WIP emission + STOP |
| TASK 3 | `.workflows/specs/task-review-wip-consume.spec` | verdict, scope, consume |
| TASK 4 | `.workflows/specs/task-refactor-wip-commits.spec` | WIP step + STOP |
| TASK 5 | `.workflows/specs/task-wip-gate-wiring.spec` | fixture fail, pre-commit |
| TASK 6 | `.workflows/specs/task-wip-dispatch-block.spec` | active block, read-only |
| TASK 7 | `.workflows/specs/task-wip-docs.spec` | docs, init, pins |

## Ledger Resolution

| Item | Disposition | Note |
|------|-------------|------|
| Stale live plan 076 | `done(commit ba56bc5)` | archived as DONE |
| Persona files | `done(commit 9485def)` | owner-authored persona restored |
| justfile removal | `done(commit 75161c8)` | mise tasks are current surface |
| Archive-count id rule | `deferred(trigger: separate bookkeeping plan)` | unrelated to WIP |
| ADR lint/allocator | `deferred(trigger: separate plan)` | owner scope |
| Untriaged ideas | `deferred(trigger: owner triage at approval gate)` | none dropped |

## Execution Notes

- Adversarial pass rejected commit trailers as WIP source of truth; trailers
  cannot identify an uncommitted dirty tree.
- Verbs and state stay deterministic. Typed judgment remains advisory and
  does not close a batch.
- Resource rule applies before every test suite.
- Depends On edges were derived by hand. The owner confirms them at approval.
- No `.spec` files, commits, or production edits are part of this draft.
