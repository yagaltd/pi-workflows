# Plan: next-thinner — dispatcher as an extension tool (036)

> Plan ID: 20261026-036
> Status: SHIPPED 2026-10-26 — v0.12.2 (final gate review-final ok:true, first pass)
> Created: 2026-10-26
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2 (same file, serial); T3 W3 (needs T1+T2 shapes); T4 W4 (inline).

## Context

`/next` + `/auto-next` prompts total 192 lines (verified 2026-10-26): the dispatcher call is an inline `bun -e` script whose registry map (`task-id → model/thinking/role`) the model hand-builds from `agents/registry.md` every run; the pair duplicates the dispatcher section; post-verdict records (proof ledger, run journal, wave-settle compaction) live as prompt prose. pi 1.4 supports `pi.registerTool()` (model-callable) and `pi.registerCommand()` (extensions.md:176-177) — the extension registers neither. This plan finishes plan-015's intent: the dispatcher becomes a registered tool, the records become extension automation, and the prompts shrink to thin triggers that survive package updates in every repo.

## Decisions

- **D1 — `dispatch_next` tool.** `pi.registerTool("dispatch_next")`: reads `.workflows/plan.md`, `agents/registry.md` (builds the registry map internally), and `.workflows/reviews/*.md`; returns the binding `resolveNext()` result plus `eligible` wave members. Zero arguments; read-only; inert without a live plan. The prompt §1 collapses to "call `dispatch_next`; the result is binding".
- **D2 — verdict automation.** The extension's edit/write interception gains a verdict branch: a write to `.workflows/reviews/<task-id>.md` whose content carries a FINAL `ok: true|false` block triggers, once per task+round (dedupe map): `proof-ledger record` + `run-journal record done|failed` (with `--cost` when the child usage is available). Skips silently when the scripts are absent (documented degradation, same class as the auto-gate advisory).
- **D3 — wave-settle compaction in the extension.** When the last pending task of a wave gains its FINAL verdict, the extension runs `scripts/judge.mjs ask` (question set built from the settled children) and injects the fixed-size verdict table via the existing before_agent_start injection. `JUDGE SKIPPED` ⇒ inject the one-sentence per-child fallback instead. No prompt step remains.
- **D4 — thin prompts.** `prompts/next.md` and `prompts/auto-next.md` rewrite to: role statement, call `dispatch_next` (auto-next adds: loop until `no-pending`, budget check per re-run), dispatch per `agents/dispatch-shapes.md`, gate per `agents/execution-doctrine.md`, handle the named exceptions (BLOCKED reasons, NEEDS_CONTEXT, parallelism confirmation). Target ≤ 40 lines each; frontmatter unchanged (check-drift section 1 + 7 keep passing).
- **D5 — version 0.12.2** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 `dispatch_next` tool registration | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 verdict automation (proof + journal + wave-settle compaction) | task-2.spec | 2 (same file, after T1) | dispatched Tier B 🟡 |
| T3 thin prompts rewrite | task-3.spec | 3 (needs T1+T2 shapes) | dispatched Tier B 🟡 |
| T4 docs + ship prep | task-4.spec | 4 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): dispatch_next tool — extensions/index.ts, tests/extension.test.ts ✅
- Register the tool per D1; reuse `parsePlan`/`resolveNext`/`eligibleTasks`; registry map built internally from `agents/registry.md` (the file read the prompt used to demand). Tests: binding JSON matches the golden fixture; inert without a live plan; read-only (no writes).

### TASK 2 (Tier B, 🟡): verdict automation — extensions/index.ts, tests/extension.test.ts ✅
- D2 verdict branch + D3 wave-settle injection. Tests: record fires once per task+round; compaction injects exactly on the wave's last verdict; degradation when scripts/key absent.

### TASK 3 (Tier B, 🟡): thin prompts — prompts/next.md, prompts/auto-next.md ✅
- D4 rewrite. Contract greps: `dispatch_next` present; selection/registry prose absent; line bounds (≤ 40 each).

### TASK 4 (Tier A, ⚪): docs + ship prep + stub retirement — orchestrator-inline ✅
- README `/next`+`/auto-next` rows refreshed (mechanism note: dispatcher tool), CHANGELOG v0.12.2, full gate chain.
- AMENDED 2026-10-26 (owner approved actions 1-4): retire `/scout` + `/integrate` stubs — delete prompts, update `skills/plan/SKILL.md` `/scout` refs to `/explore`, clean README rows. Allowed extended accordingly (skills/plan/SKILL.md for reference updates only; agents/scout.md role STAYS — brainstorm/plan flows use it).

## Adversarial pass (on record)

- New tool changes the model's tool surface → the tool is read-only and side-effect-free; existing `tool_call` handlers (@role substitution, auto-gate, verdict branch) are separate registrations — order-independent by construction (each matches its own tool name).
- Auto-record double-fires → dedupe map keyed `task-id:round` (the watchdog pattern); a second write with identical FINAL verdict is a no-op.
- Compaction injection timing → only on the wave's LAST pending verdict; single-task waves inject immediately; `JUDGE SKIPPED` ⇒ fallback injection, never silence.
- Prompt shrink vs check-drift → frontmatter keys + README command rows unchanged; drift section 7 keeps passing.
- pi API surface: registerTool/registerCommand exist in pi 1.4 (extensions.md:176-177) — no version gamble.

## Verification (whole-plan final gate)

bun test (tool JSON golden fixture, automation dedupe, compaction injection, degradation paths) · drift CLEAN · `dispatch_next` registered (extension loads; drift 3c) · prompts ≤ 40 lines + contract greps · NO-JUDGE compaction path exercised (no key on this machine — the tested default) · cc-check known-finding only · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern).
