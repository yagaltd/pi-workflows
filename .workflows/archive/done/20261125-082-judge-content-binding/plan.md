# Plan: Judge pre-flight content binding

> Plan ID: 20261125-082
> Created: 2026-11-25
> Status: DONE

## Lifecycle
- Plan ID is assigned once at bootstrap; 082 is the next unused id after shipped 081 (proposals 077-080 are not reused).
- `/idea` and `/plan` refuse to overwrite a live plan; route it to `/review` (ship → `archive/done/`) or `/abort` (superseded) first.
- SHIP (`/review`, all tasks ✅) → set Status: DONE and move the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/20261125-082-judge-content-binding/`.
- SHIP gate: run `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" archive-check <archive-target-dir>` before the bundle move.
- `/abort` → Status: SUPERSEDED, bundle to `.workflows/archive/superseded/20261125-082-judge-content-binding/` with reason.
- `.workflows/CONTEXT.md`, docs/adr/, knowledge/, and LOG.md are never archived.

## Context
- Goal: make judge pre-flight questions content-bound so verdicts are actionable; path-only questions are invalid input (scout: `.workflows/proposals/20261125-judge-content-binding.md`; observed low-confidence flags 0.16-0.47).
- `judge.mjs` sends only `q.question` as `instructions`; there is no evidence payload (`scripts/judge.mjs:75-78,150-160`).
- The client accepts only yes/no, boolean, or N-choice enums; object schemas are rejected locally (`scripts/judge.mjs:75-91`).
- `/plan` runs one judge call per contract before approval and currently writes bare `<spec path>` references with object schemas (`skills/plan/SKILL.md:597-604,647+`).
- Package-owned scripts stay in the installed package; `/init` generates namespaced mise wrappers via `buildInitMiseFragment()` (`scripts/init-extract.ts:120-141`, `skills/init/SKILL.md:210-224`).
- Constraints: no provider-side file access, no backend/schema change, no copied scripts into consumer `.workflows/`, no silent truncation, confidence floor stays 0.6, judges still flag/route only (`agents/execution-doctrine.md:96-108`).

## Sieve

| Cell | Verdict |
|---|---|
| V value | valuable |
| R risk | serious |
| E effort | s |
| path | inspect |

Outcome: propose. The scout artifact is the inspection evidence.

## Decisions

- **Content-bound pre-flight**: one contract per judge call; repeatable `--context` paths are concatenated into every question; caps are measured on the final translated payload.
  - `Cost of inaction:` low-confidence, non-actionable flags continue to consume human gate time.
  - `Blast radius:` + judge client and tests; − backend/schema language; neutral verdict-routing doctrine.
- **Yes-means-finding schema**: five yes/no questions keep the five finding ids verbatim; `yes` means the named defect is present, `no` means clear; confidence is numeric from the client, not a separate enum. No free-text finding in v1.
  - `Cost of inaction:` object schemas remain unsupported and severity enum flags still lack usable findings.
  - `Blast radius:` + plan skill/template tests; − backend, scoring, and retry behavior.
- **Spec-only context**: `--context` accepts only regular UTF-8 `.workflows/specs/*.spec`; symlinks, other paths, non-UTF-8 content, and key-shaped names are rejected.
  - `Cost of inaction:` arbitrary evidence paths widen secret-leak surface and weaken the lint.
  - `Blast radius:` + validator and tests; − other file types in v1.
- **Fail-closed truncation**: a cap breach emits `JUDGE SKIPPED (context exceeds cap: <path> ...)`, writes audit `truncated: true`, and sends nothing. No `[truncated]` partial prompt.
  - `Cost of inaction:` decisive criteria can be silently removed and re-create the original failure mode.
  - `Blast radius:` + audit/t loud-skip tests; − judge answers on oversized input.
- **Mechanical lint and package wrappers**: `scripts/check-judge-context.mjs` exposed as `judge-context`; `wf.sh` gains the verb; `/init` generates `wf:judge-context` from the existing fragment builder. Scripts are never copied into consumer repos.
  - `Cost of inaction:` path-only questions remain tribal knowledge and package updates would leave stale copied scripts.
  - `Blast radius:` + launcher/init/lint tests; − `.mise/tasks` code copies and consumer repo script trees.
- **Diff-bound stays Stage 2**: pre-flight is always content-bound; diff-bound evidence remains in `bench verdicts`.
  - `Cost of inaction:` two evidence routes blur and pre-flight can silently degrade to diff summaries.
  - `Blast radius:` + plan doctrine; − bench command surface.
- **Docs and history discipline**: docs/canon rule names the lint gate; CHANGELOG uses the next plan ID at SHIP, not 081; docs baseline regenerates only with the gate script; launcher wiring is tested.
  - `Cost of inaction:` drift gate failures, false history, or an unproven wf surface.
  - `Blast radius:` + canon/plan/docs tests; − CHANGELOG in worker tasks.

## Exploration

- Done: `.workflows/scout/20261125-082-judge-content-binding.md` is the facts-on-disk artifact.
- The accepted proposal is `.workflows/proposals/20261125-judge-content-binding.md`; this plan implements the batch-accepted decisions, not the proposal’s unresolved alternatives.
- No live plan was overwritten; no implementation has started.

## Refactor assessment

- **Scan**: extend `scripts/judge.mjs`, add one lint beside `scripts/check-spec-selectors.sh`, extend `scripts/wf.sh`, extend `buildInitMiseFragment()` in `scripts/init-extract.ts`, and update the existing plan/canon doctrine. No new judge backend, no copied scripts, no new wf framework.
- **Verdict**: `extend`.
- **Block rule**: if a provider-side file-read tool or schema change becomes necessary, stop and re-plan.

## Docs impact

- `scripts/judge.mjs` — header usage and `--context` flag semantics.
- `skills/plan/SKILL.md` — content-bound pre-flight template and yes/no guidance.
- `docs/canon.md` — “paths are pointers, not evidence” with a named gate.
- `scripts/check-judge-context.mjs` — new lint script; `scripts/wf.sh` — new verb; `scripts/init-extract.ts` — generated mise wrapper.
- Test surfaces: `tests/judge.test.ts`, `tests/judge-context.test.ts`, `tests/wf-launcher.test.ts`, `tests/init-extract.test.ts`, `tests/prompt-doctrine.test.ts`.
- `scripts/docs-lint-baseline.json` — regenerate only through the docs-lint gate.
- CHANGELOG: SHIP-only, next plan ID at SHIP; package version aligned at SHIP.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | `tdd:` Judge context binding | 🔴 BLOCKING | example-based | 1 | — |
| TASK_2 | worker | `tdd:` Judge-context lint + launcher/init wiring | 🔴 BLOCKING | example-based | 1 | — |
| TASK_3 | worker | `tdd:` Plan doctrine + docs | ⚪ STANDARD | example-based | 2 | TASK 1, TASK 2 |
| TASK_4 | worker | `tdd:` Whole-plan review fixes | 🟠 VERIFICATION_HEAVY | example-based | 3 | TASK 1, TASK 2, TASK 3 |

Wave 1 is `[PARALLEL-GROUP: A]` with disjoint Allowed Changes. Wave 2 runs after both. `/review` is the final gate.

## Tasks

### TASK 1 (Tier B 🔴 BLOCKING): Judge context binding
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-1.spec
- **Allowed**: scripts/judge.mjs; tests/judge.test.ts
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **tdd**: true
- **What**: RED first: tests pin spec text in outgoing `instructions`, rejection of non-spec/symlink/key-shaped context, fail-closed cap breach with audit `truncated: true`, unchanged yes/no mapping, and unchanged loud-skip path. GREEN: add repeatable `--context <path>` to `cmdAsk`, validate spec-only context under `.workflows/specs/`, bind context into translated instructions, measure caps on final translated payload, and skip before network on cap breach. Keep key chain, caps, answer mapping, and zero provider-side file access.
- **Verify**: `bun test tests/judge.test.ts`
- **Status**: ✅ DONE

### TASK 2 (Tier B 🔴 BLOCKING): Judge-context lint + launcher/init wiring
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-2.spec
- **Allowed**: scripts/check-judge-context.mjs; scripts/wf.sh; scripts/init-extract.ts; tests/judge-context.test.ts; tests/wf-launcher.test.ts; tests/init-extract.test.ts; tests/mise-tasks.test.ts; tests/prompt-doctrine.test.ts
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **tdd**: true
- **What**: RED first: tests pin path-only rejection with the exact finding, passing context-bound set, new `judge-context` wf verb, and generated `wf:judge-context` wrapper. GREEN: add the parse-only lint, expose it through `scripts/wf.sh`, and extend `buildInitMiseFragment()`. Do not copy scripts into consumer repos and do not edit root `mise.toml` or define `check`/`verify`.
- **Verify**: `bun test tests/judge-context.test.ts tests/wf-launcher.test.ts tests/init-extract.test.ts`
- **Status**: ✅ DONE

### TASK 3 (Tier B ⚪ STANDARD): Plan doctrine + docs
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **Contract**: .workflows/specs/task-3.spec
- **Allowed**: skills/plan/SKILL.md; docs/canon.md; scripts/docs-lint-baseline.json; tests/prompt-doctrine.test.ts
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **tdd**: true
- **What**: RED first: tests pin the content-bound pre-flight command, five yes/no schemas with `yes` = finding present, and a canon rule naming `scripts/check-judge-context.mjs` as gate. GREEN: replace the object-schema template and bare `<spec path>` references; state that path-only questions are invalid and diff-bound evidence stays Stage 2; route Step 3 fixes by finding ID with manual inspection because yes/no cannot return quoted or named details; regenerate docs baseline only with the gate script. No CHANGELOG edit and no scope change to `bench verdicts`.
- **Verify**: `bun test tests/prompt-doctrine.test.ts && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

### TASK 4 (Tier B 🟠 VERIFICATION_HEAVY): Whole-plan review fixes
- **Agent**: worker
- **Wave**: 3
- **Depends On**: TASK 1, TASK 2, TASK 3
- **Contract**: .workflows/specs/task-4.spec
- **Allowed**: scripts/judge.mjs; scripts/check-judge-context.mjs; skills/plan/SKILL.md; skills/init/SKILL.md; scripts/docs-lint-baseline.json; tests/judge.test.ts; tests/judge-context.test.ts; tests/prompt-doctrine.test.ts
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **tdd**: true
- **What**: Close whole-plan review findings: resolve context from consumer cwd; require context for pre-flight question sets even when path-free; restore numeric 0.6 confidence floor; update init wrapper inventory with wf:judge-context; regenerate docs baseline only through the gate.
- **Verify**: `mise exec -- bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

## Contracts (generated after approval)

| Task | Contract File | Scenarios |
|------|---------------|-----------|
| TASK 1 | .workflows/specs/task-1.spec | 5 scenarios |
| TASK 2 | .workflows/specs/task-2.spec | 4 scenarios |
| TASK 3 | .workflows/specs/task-3.spec | 3 scenarios |
| TASK 4 | .workflows/specs/task-4.spec | 5 scenarios |

## Ledger Resolution

Queue empty — the last ship report has no open follow-up rows.

| Item | Disposition | Note |
|------|-------------|------|

- TASK 2 fix-round scope expanded to tests/mise-tasks.test.ts: generated wf:judge-context legitimately changes the expected init fragment task set.
- TASK 2 fix-round scope expanded again to tests/prompt-doctrine.test.ts: changedPaths081() counts prior SHIP-owned CHANGELOG churn as forbidden; final suite needs the helper scoped to plan changes only.
- TASK 1: ok:true · 149.3k tokens / 8m04s (worker 79.6k/4m09s + reviewer 69.7k/3m55s) · verdict `.workflows/reviews/task-1.md`.
  context: no changes.
- TASK 2 round 1: ok:false · 146.6k tokens / 10m05s (worker 82.1k/5m20s + reviewer 64.5k/4m45s) · verdict `.workflows/reviews/task-2.md`.
  context: no changes.
- TASK 2 fix round 2: ok:true · pinned full suite 855 pass / 9 skip / 0 fail · verdict `.workflows/reviews/task-2.md`.
- TASK 3: ok:true · 175.4k tokens / 16m15s (worker 105.9k/10m06s + reviewer 69.5k/6m09s) · verdict `.workflows/reviews/task-3.md`.
  context: no changes.
- Whole-plan review: CHANGES_REQUESTED; TASK 4 added for four integration findings before SHIP.
- TASK 4: ok:true · full pinned suite 863 pass / 0 fail · verdict `.workflows/reviews/task-4.md`.
  context: no changes.
## Execution Notes
- Drafted from `.workflows/scout/20261125-082-judge-content-binding.md` and the owner-approved batch decisions.
- `JUDGE SKIPPED` is the expected pre-flight degradation while the current object-schema template is unsupported; this plan fixes that source mismatch.
- Wave 1 runs TASK 1 + TASK 2 in parallel; Wave 2 runs TASK 3; `/review` is the final gate; SHIP owns the CHANGELOG entry and package version alignment.
