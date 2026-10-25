# Task 2 — integration feasibility spike (plan 20261025-020)

## Round 1 — FINAL — ok: TRUE (reviewer pw20-t2-reviewer; 6/6 citations resolve)
- VERDICT: NO-GO for now — the spec stop rule is hit.
- Two hard blockers (file:line-cited): (1) gate contract — LayerFS commits are content-addressed Store Commits (SQLite on a Docker volume), not git objects; pi-core-subagent's gate is `git merge --no-ff <branch>` — an export-to-git bridge would be required (in-container git unverified; upstream #417 host-side walk breaks on binaries). (2) workspace locality — LayerFS workspaces are FUSE mounts INSIDE Sandbox containers; pi children need host cwds (manager.ts:543).
- Shapes: (a) pi-core-subagent backend option — NO injection point (static imports); effort L, risk M, necessary-but-insufficient. (b) pi-workflows wrapper — effort L, risk H, not plausible (stop rule). (c) fork — effort L, risk H, reachable only with the bridge; not recommended.
- Positive: pi-core-subagent 1.3.68 ships TS source (not minified) — all claims cite exact lines.
