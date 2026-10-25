# Plan: dispatch + gate mechanics (015)

> Plan ID: 20261025-015
> Status: SHIPPED 2026-10-25 — v0.8.0 (final gate review-final-r4 ok:true)
> Created: 2026-10-25
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1/T2 Wave 1 (disjoint files), T3 Wave 2, T4 Wave 3.

## Context

Backlog items 2 + 3 (`.workflows/proposals/20261024-session-backlog.md`), merged by subsystem (one file: `extensions/index.ts`, 509 lines):

- **Dispatcher** (item 2): `/next` and `/auto-next` re-derive task selection, pack assembly, and gate ordering by model reasoning every turn (`prompts/next.md`). plan.md is data — statuses, Wave, Depends On, `tdd:` flag — so selection and packing are deterministic. Cache-affinity (origin: provider prompt caching) belongs in the same code: same-model/same-role adjacency, prefix-stable layout (shared GUARD/provenance/env first; per-task divergence last), same-tier wave tiebreaker, ramped same-model launches.
- **Auto-gate hook** (item 3): gates run only when skills instruct. The extension already blocks tool calls (`block: true` on unresolvable `@role:`) — the same interception moves enforcement to write time: edit/write of code files triggers Layer 1 (agent-spec checks: contract, lifecycle, guard) then Layer 2 (test-quality checks: tdd-gate gaming/drift per plan 013); violation ⇒ block with fix-named reason.

Out of scope: item 11 (backlog entry 11 = toolchain-defect batch: agent-spec fork Node-verifier port, guard per-spec scoping, tdd-guard lint parser fix, canonical `--tests <dir>` verify) — its fixes upgrade the tools this plan invokes mechanically; judge-layer items 4/7; docs items 5/6.

## Decisions

- **D1 — resolveNext()**: pure function in the extension: input plan.md (+ optional current wave state), output `{task, pack, gateCommands}` or `{blocked, reason}`. Selection rules: pending ∧ deps-ok ∧ earliest wave; ties by tier then id. Assert: resolved task satisfies wave/dep rules (fixture plans in `tests/`, including stale-status and missing-spec cases).
- **D2 — thin `/next`**: `prompts/next.md` + `prompts/auto-next.md` shrink to: call dispatcher → dispatch per shape → handle exceptions (BLOCKED, NEEDS_CONTEXT, parallelism confirmation). No selection prose remains.
- **D3 — cache-affinity in code**: pack builder emits shared prefix block first, per-task block last; within-wave order sorts by (model, thinking, role); same-model launches ramp. Correct-by-construction; measurement is secondary.
- **D4 — ledger cache fields**: `scripts/dispatch-ledger.mjs` records `cacheReadTokens`/`cacheCreationTokens` per subagent when the provider usage carries them (null otherwise); report gains a `cache_read/input` column. If a provider exposes nothing, the column prints `n/a` — no fake numbers.
- **D5 — auto-gate blocking semantics**: violation of Layer 1 (agent-spec checks: contract, lifecycle, guard) or Layer 2 (tdd-gate gaming/drift on the touched spec) ⇒ `block: true` with command output + fix hint. Toolchain absent ⇒ one-line loud advisory, write allowed, advisory deduped per file (watchdog pattern). Docs-only writes (`*.md` outside spec dirs) skip the hook — doc enforcement is item 5's scope.
- **D6 — Version 0.8.0** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 dispatcher: resolveNext + cache-affinity ordering + pack assembly | task-1.spec | 1 | dispatched Tier B |
| T2 ledger cache fields + report column | task-2.spec | 1 | dispatched Tier B |
| T3 auto-gate hook | task-3.spec | 2 (after T1) | dispatched Tier B |
| T4 README/CHANGELOG v0.8.0 | task-4.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): dispatcher — extensions/index.ts, tests/extension.test.ts, prompts/next.md, prompts/auto-next.md ✅
- resolveNext() per D1; pack builder per D3; `/next` thin-trigger rewrite per D2. Fixture plans cover: pending/deps/wave selection, stale status, missing spec, cache-affinity ordering, ramp.

### TASK 2 (Tier A/B, 🔵): ledger cache fields — scripts/dispatch-ledger.mjs ✅
- D4 fields + `cache_read/input` column; null-safe when providers omit fields.

### TASK 3 (Tier B, 🟡): auto-gate hook — extensions/index.ts, tests/extension.test.ts ✅
- D5 semantics; edit/write interception; Layer 1 → Layer 2 ordered run; block + fix hint; degradation advisory; tests: block-on-violation, allow-on-clean, advisory-on-missing-toolchain, dedupe.

### TASK 4 (Tier A, ⚪): docs + ship prep — orchestrator-inline ✅
- README (dispatcher, auto-gate sections), CHANGELOG v0.8.0; full gate chain.

## Adversarial pass (on record)

- Dispatcher bugs become systematic → fixture plans assert selection rules; resolveNext output must match prompt-derived selection on a golden fixture before `/next` trusts it.
- Auto-gate false blocks stall real work → block only on defined violation classes; degradation advisory when tools absent; dedupe per file.
- Same-file sequencing: T1 → T3 serial on `extensions/index.ts` (never parallel — shared-file rule).
- pi-core-subagent untouched: dispatcher consumes the runtime; no runtime swap (standing rejection).
- Measurement risk: provider may omit cache fields → D4 null-safe; ordering stays correct without measurement.

## Verification (whole-plan final gate)

`bun test` (dispatcher + hook + ledger fixtures) · `bash scripts/check-drift.sh` CLEAN · `bash scripts/docs-lint.sh` exit 0 · `bash scripts/check-spec-selectors.sh` clean · `cc-check format` known-finding only · `node scripts/dispatch-ledger.mjs report` runs · `/next` dry-run on a fixture plan resolves the expected task.
