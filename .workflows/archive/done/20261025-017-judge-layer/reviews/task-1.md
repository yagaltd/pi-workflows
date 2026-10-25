# Task 1 — judge client scripts/judge.mjs (plan 20261025-017)

## Round 1 — ok: false (1 P1, real)
- P1: prescribed Layer-3 degradation smoke failed — input validation (loadQuestions) ran BEFORE the missing-key gate; `--questions /dev/null` + no key exited 1 instead of exit 0 + JUDGE SKIPPED. The 5 bun contract tests passed (they feed valid files) — the prescribed smoke exposed the gate-order defect.
- Positives: lifecycle (fork 1.5.0) BOUND the scenarios — 5 passed / 0 failed / 0 skipped, computational provenance; guard --spec single-file mode (plan-016 T2) validated end-to-end in the gate.

## Fix round (orchestrator Tier A — gate reorder + regression test)
- cmdAsk: apiKey() gate FIRST (loud skip + audit skipped entry, exit 0) before loadQuestions; fail-fast validation kept for the key-bearing path.
- +1 regression test: "skips before input validation when the key is missing" (/dev/null + no key → exit 0).

## Round 2 — FINAL — ok: TRUE (reviewer pw17-t1-reviewer-r2)
- Layer 1: lifecycle 5/5 pass (bound), 0 skipped; parse/lint clean; 5 original + 1 regression test pass; full suite 115/115.
- Layer 1b: guard --spec single-file — zero violations; diff = exactly the 2 allowed files; delta = exactly the 2 fix hunks.
- Layer 2: tdd-guard 0.1.1 — 0 violations, delta 0.
- Layer 3: prescribed smoke exit 0 + JUDGE SKIPPED; drift CLEAN.
