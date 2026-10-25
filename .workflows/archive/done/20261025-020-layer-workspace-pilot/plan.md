# Plan: layer workspace backend pilot (020)

> Plan ID: 20261025-020
> Status: SHIPPED 2026-10-25 — NO-GO verdict delivered (final gate review-final-r2 ok:true)
> Created: 2026-10-25
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Pilot plan: measurements + feasibility spike + report. NO product code changes; NO version bump (the report is the deliverable).

## Context

Backlog item 9 (`.workflows/proposals/20261024-session-backlog.md`) — the layer workspace backend pilot: LayerFS (origin note: LayerFS v1.1.0, source-available, local checkout `/home/aurel/Documents/vibe/layerfs` @ c77281e49; ×DSH integration documented upstream) as a candidate worktree backend for pi-core-subagent write children, replacing `.git/subagents/**` git worktrees. Measured axes: workspace setup latency, disk per workspace, teardown, correctness. **NO-GO default**: the git contract stays until a measured win.

Baseline on this machine (measured 2026-10-25, pi-workflows @ 2cdc011): `git worktree add` = 39 ms, `git worktree remove` = 15 ms — sub-100 ms. The latency case is therefore weak by default; the real candidates are DISK (each git worktree duplicates the full working tree — N parallel children × tree size, on a 94%-full disk) and workspace lifecycle (commit/discard without .git pollution). The pilot decides on numbers, not narrative.

Machine state: LayerFS local checkout present, Linux ✓; no `layerfs` binary on PATH — building from source is part of the pilot. Store runs in its Disposable profile (no crash durability) — acceptable for ephemeral agent workspaces, documented.

## Decisions

- **D1 — Measure the primitive, not an integration.** T1 benchmarks, on the real pi-workflows tree: (a) git baseline — `git worktree add/remove` ×20; (b) LayerFS — workspace create → write-probe → commit → discard ×20 via its documented interface (built from the local checkout). Metrics: setup/teardown latency p50/p95, disk per workspace (`du`), correctness (file tree identical to source, zero `.git` pollution in the workspace). Harness: `scripts/bench-worktree-backend.sh`, results appended to the report.
- **D2 — Feasibility spike (read-only).** T2 reads: the LayerFS plugin/API surface (`api/` — `@layerfs/agent`, `@layerfs/backend`; the `plugins/` examples incl. `magpie-layerfs`) and the pi-core-subagent worktree-creation point, then reports the integration shape: backend option / wrapper / fork — with an effort estimate. No code written.
- **D3 — GO/NO-GO criteria (all required for GO).** (1) LayerFS workspace setup ≤ 0.5× git baseline p95; (2) disk per workspace ≤ 0.5× git worktree; (3) teardown clean (no residue, no .git pollution); (4) T2 finds an integration path that does NOT fork pi-core-subagent. Any criterion unmet or unmeasurable ⇒ NO-GO. NO-GO ⇒ item 9 closes with the report; the git contract stays.
- **D4 — Isolation.** No pi-workflows production code changes; no pi-core-subagent changes; LayerFS checkout touched only by its own build. Benchmarks run against a COPY-scoped fixture where LayerFS mutates state (its Store), never against the owner's global config.
- **D5 — Deliverable = the report.** `.workflows/reviews/layerfs-pilot.md` (numbers + feasibility + GO/NO-GO), committed. No version bump, no CHANGELOG entry (no product change); LOG records the pilot.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 benchmark harness + measurements | task-1.spec | 1 | dispatched Tier B 🔵 |
| T2 integration feasibility spike | task-2.spec | 1 (parallel, read-only) | dispatched Tier B 🔵 |
| T3 pilot report + GO/NO-GO | task-3.spec | 2 (needs T1+T2) | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🔵): benchmark harness + measurements — scripts/bench-worktree-backend.sh, results file ✅
- Build LayerFS from the local checkout (documented build path); implement D1 measurements; N=20 per side; write the results table.
- **Verify**: harness exits 0; results table complete (both backends, all axes); git baseline matches the 39 ms order of magnitude.
### TASK 2 (Tier B, 🔵): integration feasibility spike — read-only ✅
- D2 report: the LayerFS plugin/API surface vs pi-core-subagent's worktree creation; integration shape + effort estimate; blockers named.
- **Verify**: spike findings cite file:line in both codebases.

### TASK 3 (Tier A, ⚪): pilot report + GO/NO-GO — orchestrator-inline ✅
- D3 decision from T1 numbers + T2 shape; `.workflows/reviews/layerfs-pilot.md`; NO-GO closes item 9.

## Adversarial pass (on record)
- 39 ms git baseline means latency wins are cosmetic — the disk axis and lifecycle hygiene carry the case; if LayerFS only wins latency, that is NO-GO per D3(1)-and-D3(2) conjunction.
- LayerFS build may need toolchains absent here → a build failure is a pilot RESULT (NO-GO-environment), not a blocker to fix on the owner's machine.
- Disposable Store = crash-window data loss in workspaces — acceptable for agent work (children re-runnable), documented in the report.
- Benchmarks on a 94%-full disk → harness records free-space before/after; low-disk aborts cleanly.
- Pi-core-subagent is a pinned peer dep (>=1.3.49) — integration proposals that require forking it are recorded as such (heavier lift, separate plan if GO).

## Verification (whole-plan final gate)

`scripts/bench-worktree-backend.sh` reproducible (exit 0) · results table complete in `.workflows/reviews/layerfs-pilot.md` · GO/NO-GO verdict present and criteria-cited · drift CLEAN · bun 115/109+ green · docs-lint exit 0 · final whole-plan reviewer (read-only over committed evidence — the 015–019 pattern).
