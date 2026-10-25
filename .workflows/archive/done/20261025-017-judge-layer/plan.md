# Plan: judge layer — contract pre-flight + verdict compaction (017)

> Plan ID: 20261025-017
> Status: SHIPPED 2026-10-25 — v0.8.2 (final gate review-final ok:true, first pass)
> Created: 2026-10-25
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2+T3 W2 (disjoint files); T4 W3.

## Context

Backlog items 4 + 7 (`.workflows/proposals/20261024-session-backlog.md`), merged by subsystem (one judge client, two call sites):

- **Item 4 — contract pre-flight**: one decision-DAG call per drafted contract — `criterion_testable`, `boundary_complete`, `ambiguity` score, `missing_scenarios`, `second_path_violation` → findings become drafter fix rounds BEFORE the approval gate. agent-spec lint stays the mechanical authority.
- **Item 7 — verdict compaction + triage**: at wave settle, one `/v1/generate` call with ≤64 typed questions → fixed-size verdict table into leader context; batch failure triage per wave. Replaces re-reading every child narrative.

Origin note: the judge client speaks the TypeLLM `/v1/generate` API (origin: TypeLLM). Machine state: NO TypeLLM key/config exists today — key-absence degradation (D2) is the tested default path, not an edge case.

## Decisions

- **D1 — one client.** `scripts/judge.mjs` (node ≥20, fetch, no SDK): `ask <plan-file> --questions <json>` posts a typed question set (JSON-schema answers) to the TypeLLM API. Config: `TYPEDLLM_API_KEY` + `TYPEDLLM_BASE_URL` env. Client enforces the 64-question cap (larger sets rejected locally). Every call appends the question set + verdict table to an audit file.
- **D2 — NO-JUDGE degradation.** Key absent or API unreachable ⇒ exit 0 with a loud `JUDGE SKIPPED (reason)` line + skip recorded in the audit file. Never blocks, never fabricates verdicts. Same doctrine as every other optional tool.
- **D3 — pre-flight semantics (item 4).** After Phase 5 contract generation, the orchestrator runs one pre-flight call per contract. Output: a typed findings table. Findings become drafter fix-round input; the judge can FLAG, never PASS — the approval gate stays human, agent-spec lint stays mechanical authority. Low-confidence verdicts escalate to the human.
- **D4 — compaction semantics (item 7).** At wave settle, the orchestrator builds one question set from child verdicts (per task: outcome, blockers, deviations, cost bucket) + failed-task triage groups → one call → fixed-size table printed into leader context. Hard cap: ≤64 questions or the set is split across calls.
- **D5 — wiring.** `prompts/plan.md` Phase 5 gains the pre-flight step (run judge → findings feed the drafter → re-run after fixes → approval ask); `prompts/next.md` gains the wave-settle compaction step (≤1 paragraph added — the thin-trigger rule holds); `agents/execution-doctrine.md` gains the judge-placement section.
- **D6 — version 0.8.2** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 judge client + schema + degradation + audit | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 contract pre-flight (item 4) | task-2.spec | 2 (needs T1) | dispatched Tier B 🟡 |
| T3 wave-settle compaction (item 7) | task-3.spec | 2 (needs T1, parallel T2) | dispatched Tier B 🟡 |
| T4 docs + ship prep | task-4.spec | 3 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): scripts/judge.mjs — extensions untouched ✅
- D1 client: env config, JSON-schema answers, 64-cap, timeout, audit append (`--audit <file>`), NO-JUDGE degradation (D2). bun:test suite with a local stub HTTP server (success, schema violation, unreachable, missing key).

### TASK 2 (Tier B, 🟡): contract pre-flight — prompts/plan.md, agents/execution-doctrine.md ✅
- D3 wiring: Phase 5 step + question template + fix-round loop text + audit location. Machine-checkable via grep; behavioral loop asserted in prompt text review.

### TASK 3 (Tier B, 🟡): wave-settle compaction — prompts/next.md ✅
- D4 wiring: wave-settle step + question template (≤64) + fixed-size table + triage groups. ≤1 paragraph net growth.

### TASK 4 (Tier A, ⚪): docs + ship prep — orchestrator-inline ✅
- README judge section (config, degradation), execution-doctrine cross-check, CHANGELOG v0.8.2, full gate chain (runs in NO-JUDGE mode — the degradation path IS the gate-tested path).

## Adversarial pass (on record)

- No key today ⇒ every gate run exercises degradation; the live-key path is stub-server tested only — first real-key run is a separate validation, not a gate.
- Judge hallucination → typed schema + flag-only semantics + low-confidence escalation (standing principles 1 and 4). The judge never gates; it informs the human gate.
- Prompt bloat regression (thin-trigger rule) → T3 net growth ≤1 paragraph; check-drift + plan-marker greps unchanged.
- Audit file growth → one file per plan, moved to archive with the plan bundle.
- Cost: judge calls are uns metered this plan — acceptable (2 calls per plan/wave); metering deferred until usage justifies it.

## Verification (whole-plan final gate)

bun test (judge client: schema, cap, degradation, audit) · drift CLEAN · docs-lint exit 0 · selector lint clean · cc-check known-finding only · NO-JUDGE path exercised end-to-end (pre-flight + compaction both print JUDGE SKIPPED) · final whole-plan reviewer (read-only over committed evidence — the 015/016 R4 pattern).
