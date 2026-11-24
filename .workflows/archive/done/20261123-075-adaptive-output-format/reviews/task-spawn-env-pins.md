# Review — backlog #9 quick half: spawnSync env pins (owner-directed "do them all")

- Worker: pw51-spawn-env (run_mvzavknb_7v6cz5/task_1) — Review: orchestrator-inline, registry Tier A (mechanical pattern replication of the reviewed extensions/index.ts fix, merge 3263185).
- Diff: scripts/flow-gates.mjs (3 pins: L65 guard --help probe, L116 runGate exec, L122 command -v probe) + scripts/eval-golden.mjs (1 pin: L99 eval-dispatch probe) + rationale comments mirroring the reviewed wording. No other changes.
- Transport verified on main: node --check ok both; pins counted 3+1; suite 249/0; eval-golden 12/12 0 flips (absolute baseline paths — worktree lacks .workflows/evals, noted).
- Verdict: **ok: true** (orchestrator-inline, Tier A)
