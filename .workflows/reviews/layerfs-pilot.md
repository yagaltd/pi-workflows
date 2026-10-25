# Pilot report — layer workspace backend (plan 20261025-020)

## 1. Measured table (TASK 1 — .workflows/reviews/layerfs-bench.md)

| Axis | git worktree (current backend) | LayerFS |
|---|---|---|
| Setup p50 / p95 | 25.0 / 25.5 ms | n/a — unmeasurable here |
| Teardown p50 / p95 | 12.0 / 13.1 ms | n/a |
| Disk per workspace | 2.9 MB (244-file tree) | n/a (Store on Docker volume) |
| Correctness | 20/20 probes | build ok; runtime requires Docker |
| Build | n/a | ok — cargo 1.85.1 pinned, napi binding, cold 1m38s |

Environment: pi-workflows @ post-T1 merge, load 2.24, disk 32.3 GB free before and after. N=20 per side.

## 2. Feasibility summary (TASK 2 — .workflows/reviews/layerfs-feasibility.md)

Two hard blockers, both file:line-cited:
1. **Gate contract**: a LayerFS commit is a content-addressed Store Commit (SQLite on a Docker volume), not a git object. pi-core-subagent's gate contract is `git merge --no-ff <branch>` — nothing to merge. An export-to-git bridge would be required (in-container git unverified; upstream #417 host-side walk breaks on binaries).
2. **Workspace locality**: LayerFS workspaces are FUSE mounts inside Sandbox containers; pi children need host cwds (manager.ts:543). No host path exists — the child runs in-container (dispatch rewrite) or via exec-proxy.

Shapes: (a) pi-core-subagent backend option — no injection point exists; effort L, risk M, necessary-but-insufficient. (b) pi-workflows wrapper — effort L, risk H, not plausible without upstream changes (stop rule hit). (c) pi-core-subagent fork — effort L, risk H, reachable only with the export-to-git bridge; not recommended.

## 3. Criteria scorecard (plan D3 — GO requires ALL four)

- **Criterion 1** (setup ≤ 0.5× git baseline p95): UNMEASURABLE — LayerFS runtime requires Docker; none on this machine.
- **Criterion 2** (disk ≤ 0.5× git worktree): UNMEASURABLE — Store lives on a Docker volume.
- **Criterion 3** (clean teardown): UNMEASURABLE — same runtime dependency; Disposable Store documented (no crash durability).
- **Criterion 4** (no-fork integration path): UNMET — no injection point in pi-core-subagent; the wrapper shape is not plausible; every path needs the export-to-git bridge.

## 4. GO/NO-GO verdict: **NO-GO**

All four criteria are unmet or unmeasurable on this machine. Per the NO-GO default: the git worktree contract stays; backlog item 9 (the LayerFS pilot: LayerFS as worktree backend for write children — measure setup latency + disk vs git worktrees) closes with this report.

## 5. Next step

Item 9 CLOSED (NO-GO, evidence-cited). Re-evaluation triggers, if any: (a) a Docker engine appears on this machine AND (b) LayerFS ships a git-bridge or an injection point lands upstream in pi-core-subagent. Until both, reopen only with new evidence — the bench harness (`scripts/bench-worktree-backend.sh`) is committed and re-runnable.
