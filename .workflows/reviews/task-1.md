# Task 1 — worktree-backend benchmark harness + measurements (plan 20261025-020)

## Round 1 — FINAL — ok: TRUE (reviewer pw20-t1-reviewer; all layers green, no findings)

- GUARD: review-1 worktree under <repo>/.git/subagents/, worker HEAD 80e03aa verified in-tree.
- Layer 1 (contract): agent-spec lint exit 0 (0 ERROR); lifecycle 0 failed / 5 skipped = command-form-selector KNOWN-ACCEPTANCE (recorded plan-017; verbatim execution authoritative). All 5 contract Test: commands exit 0, including --cleanup-only (exit 0, zero bench residue in git worktree list).
- Layer 1b (boundary): guard --spec single-file mode — zero boundary violations; changed paths via git diff --name-status 8e910cd..80e03aa = {scripts/bench-worktree-backend.sh (A), .workflows/reviews/layerfs-bench.md (A)} ⊆ allowed (results file counted in).
- Layer 2: n/a (bash + evidence markdown).
- Layer 3 (coherence, full benchmark NOT re-run — the worker's results file is the evidence): layerfs-bench.md git p50/p95 setup 25.0/25.5 ms ≤ 500 ms ceiling; teardown 12.0/13.1 ms; disk before/after 32344.6 MB; build state "build ok" + toolchain (cargo 1.85.1 pinned, CARGO_BUILD_JOBS=2, cold 1m38s / warm 194.6 ms); load average recorded; LayerFS runtime "n/a" with documented NO-GO-environment + doc citation. Script greps confirm mechanics (date +%s%N, 5 GB guard → exit-0 ABORTED, --cleanup-only).

## Measured headline (worker-1, verified by the reviewer's coherence pass)
- git worktree add p50 25.0 / p95 25.5 ms; remove 12.0 / 13.1 ms; disk 2.9 MB per worktree (244-file tree); correctness 20/20 (marker + tree-diff vs source excl. .git/node_modules/.workflows/untracked; .git gitfile-pointer assert).
- LayerFS: build OK (documented path `node api/scripts/build-native.mjs`, cargo +1.85.1 --offline --locked -p layerfs-node → api/binding/layerfs.node 12.76 MB); runtime UNMEASURABLE on this machine — sandbox.create/workspace.mount require a Docker engine (none) → NO-GO-environment recorded with doc citation; the harness encodes the full docker-present lifecycle for capable machines.
