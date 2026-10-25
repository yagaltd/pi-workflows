# Plan: test-quality gate verdict + wiring (013)

> Plan ID: 20260924-013
> Status: SHIPPED 2026-10-24 — v0.7.0 (final gate review-final-r2 ok:true)
> Created: 2026-10-24
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Two repos: pi-workflows + vibe/tdd-gate (cross-repo tasks carry REPO GUARD + cwd).

## Context

Proposal `.workflows/proposals/20261024-test-quality-cli.md` required one verdict: which CLI is the Layer 2 (test-quality) gate. Evidence: T7p trust test (Jev GO advisory-only: 43/43 agreement, 0 FP/FN, honest caveats — skew, circularity; thresholds noul 0.85 / choice 0.90 carried untested), post-v0.6.1 architecture proposal layer map (de-stacked), and superseded plan 012's design (salvaged here minus its cancelled halves: D6 @cc graduation rule and the `--contracts` input mode — see owner abort 2026-10-24, commit 4b16f58). Requirements home stays `.spec` only; `@cc` scope = code-local invariants only (CONTRACTS scope line).

## Verdict

**tdd-gate = the Layer 2 (test-quality) gate for build tasks. tdd-guard fork `lint` = deterministic pre-filter, demoted to brownfield `/fix` + `/refactor` only — never a gate.**

## Decisions

- **D1 — Verdict as stated.** tdd-gate becomes the only Jev consumer in pi-workflows. TypeLLM decision DAGs (plan-time, wave-boundary compaction) are a separate mechanism and provider — not a Jev aid; no overlap with this gate.
- **D2 — Two-phase dispatch for build tasks** (from 012 D2, unchanged): tester role (write worktree, tests only, RED expected) → orchestrator runs `tdd-gate coverage --spec .workflows/specs/<task>.spec --tests <dir> --format json` → gaps loop to tester → clean ⇒ merge tester branch → code worker + reviewer wave (worker implements to GREEN; reviewer Layer 2 = `tdd-gate gaming --diff` + `drift --spec` on the worker diff). `blame` output rides fix-round prompts.
- **D3 — Degradation** (012 D3): tdd-gate not installed ⇒ legacy single-worker shape, skip stated loudly in dispatch; never a silent pass. `agent-spec` absent ⇒ `--spec` mode hard-errors with install hint. No auto-fallback to tdd-guard for gating.
- **D4 — pi-typesafe de-stacked** (012 D4): quality-reviewer Check #5 (Jev compliance pre-pass) replaced by contract-relevance check (violations only when tied to changed behavior, a relied-upon assumption, or a changed contract); extension supersede probability-routing seam removed, static advisory line stays.
- **D5 — tdd-guard demoted to brownfield** (012 D5): optional peer; cited only in `/fix` and `/refactor`; removed from build-task Layer 2 and worker self-verify.
- **D6 — Supersede watchdog owner routing** (012 D7): `owner:` metadata = sign-off target; `adr:` stays the decision link; mechanical trigger unchanged, advisory-never-gates.
- **D7 — Cross-repo protocol** (012 D8): tdd-gate tasks run with cwd=/home/aurel/Documents/vibe/tdd-gate (REPO GUARD carries it); specs live in pi-workflows `.workflows/specs/`; `Verify:` lines cd into the target repo.
- **D8 — No graduation rule.** Superseded 012 D6 is NOT revived. `@cc` stays scoped by CONTRACTS: code-local invariants only.
- **D9 — Version 0.7.0** at SHIP.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `tdd-gate --spec` input mode | task-1.spec | 1 | @model:standard |
| T2 agents/*: tester role, two-phase shapes, Layer 2 swap, quality check swap | task-2.spec (needs T1) | 2 | @model:standard |
| T3 skills/*: add-feature/fix/refactor/plan wiring | task-3.spec (needs T2) | 3 | @model:standard |
| T4 extension: owner routing + Jev seam removal | task-4.spec | 1 | @model:standard |
| T5 templates/README/package/CHANGELOG + drift | task-5.spec (needs all) | 4 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟠): tdd-gate `--spec` input mode — REPO: /home/aurel/Documents/vibe/tdd-gate ✅
- **What**: shells `agent-spec parse --format json`, maps `sections[kind=acceptance_criteria].scenarios[]` → requirements (probe-verified 2026-09-24; no duplicate parser). Missing agent-spec ⇒ hard error + hint.
- **Verify**: tdd-gate test suite green + fixture round-trip.

### TASK 2 (Tier B, 🟡): agents/* — tester role, two-phase shape, Layer 2 swap ✅
- **Allowed**: agents/tester.md (new), agents/registry.md, agents/worker.md, agents/reviewer.md, agents/quality-reviewer.md, agents/execution-doctrine.md, agents/dispatch-shapes.md
- **What**: tester.md (write, medium); registry row (closed set grows by one, registered); `tdd task` dispatch shape per D2; reviewer Layer 2 rewrite (D1/D3); worker self-verify update; quality-relevance check per D4; doctrine degradation rule per D3.
- **Verify**: `cc-check format && bash scripts/check-drift.sh`

### TASK 3 (Tier B, 🟡): skills/* — flow wiring ✅
- **Allowed**: skills/add-feature/SKILL.md, skills/fix/SKILL.md, skills/refactor/SKILL.md, skills/plan/SKILL.md
- **What**: add-feature two-phase dispatch + Layer 2 swap; fix/refactor keep tdd-guard (brownfield, D5); plan: `tdd:` task flag routes to tester shape; spec-drafter note unchanged (scenarios carry `Test:` selectors).
- **Verify**: `cc-check format && bash scripts/check-drift.sh`

### TASK 4 (Tier B, 🟠): extension — owner routing + Jev seam removal ✅
- **Allowed**: extensions/index.ts, tests/extension.test.ts
- **What**: supersede advisory names `owner:` values (absent owner ⇒ generic human-gate line); remove `supersedeAdvisoryLine` probability seam; tests updated.
- **Verify**: `bun test`

### TASK 5 (Tier A, ⚪): docs + ship prep — orchestrator-inline ✅
- **What**: README command/gates sections, CHANGELOG v0.7.0, doc stamps where affected; full gate chain.
- **Verify**: `cc-check format && bash scripts/check-drift.sh && bun test`

## Adversarial pass (on record)

- tdd-gate maturity/key risk → D3 degradation + T7p thresholds carried advisory-conservative; cross-repo tasks isolated in W1/W2.
- Single-surface check: tdd-gate sole Jev consumer REMOVES a parallel path (pi-typesafe pre-pass) — no second path created.
- Registry closed-set rule: tester joins only via registered row (T2 Allowed includes registry).
- Scope guard: no `--contracts` mode, no graduation rule (D8) — cancelled halves stay cancelled; re-proposal needs new evidence.
