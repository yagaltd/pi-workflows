# Review — fix round (owner-directed, backlog #1/#2/#3) — spawnSync env pin

- Reviewer: pw50-reviewer (run_mvza2ldx_ewhy06, bash-enabled)
- Worker: pw50-gate-fix (run_mvz9nt85_ma088n; branch subagents/run_mvz9nt85_ma088n/task_1, fix commit 80325e0)
- Context: no plan/spec — owner-directed toolchain repair (agent-spec swap + suite red), logged 20261102 in LOG.md

## Reviewer findings (executed itself, no borrowed evidence)
- Layer 2: diff = extensions/index.ts ONLY, +19/−3; pins line-exact (L1033 runGate, L1468 runCapture, L1741 runScript; rationale L1016); tests/ diff EMPTY. Bun-semantics probe REPRODUCED the root cause: bun 1.3.11 no-env → err:ENOENT (shim invisible), with-env → shim ran. Root cause = spawnSync resolved against Bun's process-STARTUP env/PATH snapshot.
- Layer 3: suite with fix 238 pass / 0 fail / 11 skip (249 tests; skips pre-existing, identical list in the 14-fail RED baseline — fix alone turned RED→GREEN). check-drift + docs-lint + agents-lint CLEAN. Out-of-scope latent pattern confirmed, routed to backlog row 9: scripts/flow-gates.mjs (L65/L116/L122) + scripts/eval-golden.mjs (L99).

## Verdict

**ok: true**
