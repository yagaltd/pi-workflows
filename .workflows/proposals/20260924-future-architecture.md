# Proposal: post-v0.6.1 architecture direction (design notes, NOTHING BUILT)

- Date: 2026-09-24
- Status: PROPOSAL — investigation complete, zero code, zero decisions locked
- Origin: design thread following v0.6.1 ship (DeepClause / AIDLC / probity / tdd-gate / Laya comparison)
- Doctrine reminder: every item below needs a trust-gated prototype (known-bad corpus, GO/NO-GO) before wiring.

## Problem

v0.6.0/v0.6.1 shipped @cc + mechanical gates, but the operational pains remain:
subagents return no-job / wrong context (hand-assembled packs), review cost scales
with re-review on fix rounds, test-order and test-content gaming are unchecked.

## Layer map (target — MINIMAL, de-stacked 2026-09-24 after user challenge)

| Layer | Question | Tool | Status |
|---|---|---|---|
| Order (when) | red-before-green | **pipeline structure itself**: coverage gate runs before code agent exists; no hook needed | design |
| Semantics | does the test test the thing; gaming/weakening/drift/blame | **tdd-gate** (Jev-native, between-turns, isolated agents) — THE gate | candidate, eval-first |
| Content (unfakeable) | memorized answers | PBT: fast-check/proptest + bombadil (UI) | drafted in orphaned worktree run_mu9mzoqg, unmerged |
| Pre-filter | weak-test smells, deterministic, free | tdd-guard fork `lint` — demoted to optional matrix-shrinker before paid Jev calls; NOT a gate | in use (optional) |
| Decisions elsewhere | routing/supersede | pi-typesafe (shipped, advisory) / Laya (local, needs temp fitting — also tdd-gate client.ts swap seam) | shipped / candidate |

**DROPPED**: probity engine port (order = pipeline shape; off-plan ad-hoc turns = YAGNI until observed).
**No brownfield tool**: /audit (+ DeepClause codekb later) characterizes → requirements harvested → tdd-gate applies.

## The ladder (canonical, 2026-09-24 — ONE change per step; a row ships only when its gate passes; next row doesn't start until the previous ships)

| # | The ONE change | Replaces | Ship gate |
|---|---|---|---|
| 1 | `build-pack.mjs` — script-assembled packs (spec verbatim + cc-check list + verify lines + seams), canonically ordered | orchestrator hand-assembly | byte-identical rerun; 1 real task on a script pack |
| 2 | plan-time skeletons for new seams (signatures + @cc + test stubs; workers fill) | worker-authored contracts on new files | cargo check / tsc --noEmit on skeletons alone |
| 3 | `pw.mjs` verbs next/claim/done/archive + criterion-freeze hash (ank steal) | model-edited plan Status + watchdog cleanup | invalid transition refused; hash catches edited criterion |
| 4 | code-parser index → @cc↔symbol binding + import-graph pack expansion | agent grep for related files | pack mechanically includes imported @cc |
| 5 | tdd-gate: eval corpus FIRST, then wire on VERIFICATION_HEAVY | adds semantic gate; tdd-guard verify --spec begins retiring | eval P/R + known-bad: sneaky write must NOT unlock |
| 6 | PBT revival (orphaned draft → testing table + Verify lines) | fills gap | gamed fixed-input test must fail |
| 7 | review upgrades: enum verdicts + findings ledger + anchored evidence + failed-checks-only fix rounds | prose verdicts; full re-review | anchor-less P1 = format fail; ledger survives fix round |
| 8 | hooks: post-verdict write-freeze + pack injection at dispatch | review-discipline prose | post-verdict write mechanically refused |
| 9 | model tiering: execution → local/non-reasoning (Tier A + skeleton-fill first) | deepseek-only execution | dispatch-ledger misfire rates acceptable |
| 10 | DeepClause prototype in scratch (pack predicate + task/N + checks + ready-set) — **no prerequisites; pull forward anytime**; its GO/NO-GO decides whether rows 3+8 get built at all | nothing — experiment | GO/NO-GO on its known-bad corpus |
| 11 | only if 10 GOs: new repo + PARITY.md; agent-spec + tdd-guard retire on parity | markdown substrate | one real task side-by-side, parity checklist |

Folded, not stacked: ank→row 3 patterns; AIDLC→rows 1/7/8 patterns; rustlm→row 1 ordering rule; Laya-vs-Jev→decided inside row 5's eval. Parked (NOT decided): probity port, leiden retrieval (exploration-only), AIDA multi-lens fan-out.

**Greenfield rule (2026-09-24)**: rows 2/4/5/6/7/9 are substrate-independent (port with you); only 3 + 8-half are markdown-coupled. If row 10 GOs → greenfield new repo immediately, port keep-list (@cc+cc-check, ADRs, roles, tier doctrine, verdict authority, archive/LOG/CONTEXT, shipped rows); rows 3+8-partial never built in markdown. If NO-GO → ladder continues, zero regret. Greenfield WITHOUT the prototype first is the only forbidden order (bets before corpus).

## Key findings (evidence in thread, 2026-09-24)

- ponytail-review pattern (2026-09-24): complexity `rate` at review gates a prioritized optimize pass (never a blocker); optimize must re-clear the full verification stack (tests+PBT+tdd-gate); scorer trust-gated on labeled diffs first; Tier A skips the question.
- tdd-gate: 5 Jev gates over bounded (requirement,test,diff) context; CLI --format json; client.ts = Laya swap seam. Use as-is via exec/2; no fork yet.
- DeepClause speckit: /dc-check > agent-spec parse (coverage/delta/orphans, 0 tokens); plan_task ≈ .spec field-for-field + needs paths:/depends:.
- AIDLC steals: write-freeze receipts, compiled rule chain (=P0), learning loop (affirm → CONTEXT.md at /review end), park + doctor.
- Laya: ECE 0.081 only after domain temp fitting; raw 0.466. Never threshold-gate unfitted.
- DeepClause single-flight: concurrent dc_run rejected — parallelism must come from host.
- ank (haksolot): ~70% duplicate of our layer (@cc/context-query/done-verifiers); STEAL patterns only: (1) criterion freeze — hash Done/Verify into claim record unreachable by the task's editor; (2) git CAS claim refs for multi-agent contention (banked, not needed solo); (3) verifiers declared once in reviewed config, tasks reference by name. Docs-as-replay-scripts discipline noted. Not adopted as infra for current PW (orchestration mass is ours; storage format unstable at 0.x). **Phase-2 candidate**: ank-as-state-layer for the DeepClause repo (blocked_by dep graph + frozen criteria + verify-by-name + proof) evaluated vs hand-rolled .workflows against PARITY.md. NOTE: ank has NO in-file mechanism — scope globs only; its ADR ≈ our CONTRACTS-file layer, not @cc; @cc stays regardless (attachment by symbol > by path for seam invariants).
- AIDA vs local-ci: orthogonal layers — local-ci (redwoodjs) = local GHA runner w/ pause-on-failure + retry-failed-step (fix-round mechanic at execution layer); AIDA = review logic as workflows. Steal from AIDA: findings ledger (accept/reject persists across reviews), schema-anchored evidence {source,path,line,side} in verdict files, incremental scope for fix rounds (security always full).

## Engine-core direction (2026-09-24, from ank/AIDLC synthesis)

Rule: state/order decisions → code; quality/meaning → model under bounded contracts; taste → human.
Evolution (incremental, each step replaces one prose discipline): P0 pack-builder → `pw.mjs` verbs (`next` ready-set query / `claim` / `done` / `archive` with validating transitions, ank-pattern exit codes) → directive output (AIDLC engine/conductor split) → pi hooks ONLY for hard invariants (post-verdict write-freeze). Three surfaces, three jobs: CLI = flow, hooks = invariants, skills = conductor + judgment. Survives DeepClause migration (`pw next` ≈ ready-set query).

## @cc skeleton authoring (2026-09-24)

Hybrid: plan-time skeletons for NEW public seams (tier B/C): file + exported signatures + @cc blocks + test stubs mapped to scenario ids; cheap diff-review gate on skeleton commit; workers fill bodies only (pack = file + its @cc + imported-files' @cc + stubs). Existing-file changes keep v0.6.0 worker rule. Fixes the self-authoring flaw (post-hoc contracts justify; pre-written contracts constrain). Rust: todo!() skeletons compile → cargo check = plan-time interface-graph gate; TS: tsc --noEmit + separate test-file stubs; Python: NotImplementedError + docstrings. Risks: skeleton quality ≤ plan quality (tier B/C only, /amend applies); skeleton public seams only, never internals.

## Explicitly NOT decided

Laya vs Jev for the judge seat; P2 timing; tdd-guard fork retirement date;
bombadil resurrection. All gated on corpora, not chat.
