# Task 1 — dispatch_next tool registration (plan 20261026-036)

## Round 1 — FINAL — ok: TRUE (reviewer pw36-t1-reviewer; all layers green, no findings)
- Layer 1: fork 1.5.0 lifecycle BOUND the bun-form selectors — {passed: 4, failed: 0, skipped: 0}; parse OK; lint Quality 100%, 0 ERROR. All 4 contract tests exist with exact titles and pass individually.
- Layer 1b: guard --spec single-file — "1 spec(s) passed", 0 violations; worker commit ffb247a diff = exactly {extensions/index.ts, tests/extension.test.ts}.
- Layer 2: tdd-guard 0.1.1 — 6/6 rules, 0 violations; delta trivial.
- Layer 3: full bun 203 pass / 11 fail — the 11 PROVEN pre-existing (clean clone @ 806cfe3: identical failure names; pre-task baseline 199/11); delta = +4 passing, 0 new failures. Drift CLEAN (3c). Tool evidence: registerTool("dispatch_next") :1466; execute input = cwd only (:645); registry built internally :662-666; inert path :649-658.
- Shipped mechanics: dispatchNext({cwd}) pure; parseRegistryPolicy (emoji-keyed policy rows, tag-row-wins precedence) + buildRegistry; payload {ok, task, pack, gateCommands, eligible}; inert = structured ok:false no-plan, never throws.
- BASELINE CORRECTION on record: the plan-pack's "115 baseline" was stale — real pre-task suite = 199 pass / 11 pre-existing failures (live-repo-state tests from plans 021–033). Delta-clean is the gate fact.
- Adjudicated doc tension (non-blocking): registry.md ⚪ row "medium" vs tier-A overlay "low" — deterministic precedence implemented (tag row wins, tier fallback), documented at the registry-policy-table @cc seam.
