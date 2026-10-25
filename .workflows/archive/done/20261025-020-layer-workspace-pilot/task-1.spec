spec: task
name: "worktree-backend-bench"
tags: []
---

## Intent

Build and run the worktree-backend benchmark (plan 20261025-020 D1): on the real pi-workflows tree, measure git worktrees (the current backend) vs LayerFS workspaces across N=20 create/write-probe/commit/discard cycles. Axes: setup latency p50/p95, teardown latency, disk per workspace, correctness (file tree identical, zero .git pollution). Results land in a committed evidence file. A LayerFS build failure or a low-disk abort is a RESULT (NO-GO-environment), recorded — never a blocker to fix on the owner's machine.

## Decisions

- Harness: `scripts/bench-worktree-backend.sh` — git side: `git worktree add` → probe write → remove, ×20, timing via `date +%s%N`; LayerFS side: the local checkout's documented build (`/home/aurel/Documents/vibe/layerfs`, bounded jobs — CARGO_BUILD_JOBS=2 / npm equivalent) then its workspace create → probe → commit → discard ×20 via the discovered CLI/API.
- Resource guards: abort cleanly (exit 0 with an ABORTED result entry) if free disk < 5 GB before or during the run; bounded build jobs; free-space recorded before/after.
- Results file: `.workflows/reviews/layerfs-bench.md` — per-side sections, p50/p95 tables, disk columns, build toolchain + duration, environment notes (load average at run time).
- Correctness probe: after each workspace setup, create a marker file, and verify the workspace file tree matches the source tree (excluding VCS/store metadata); teardown leaves zero residue (`git worktree list` clean; LayerFS store state documented).

## Boundaries

### Allowed Changes
- scripts/bench-worktree-backend.sh
- tests/bench/**
- .workflows/reviews/layerfs-bench.md

### Forbidden
- Do not modify the LayerFS checkout (build outputs stay inside it or in a temp dir).
- Do not modify pi-core-subagent or any production file.
- Do not run the LayerFS Store against the owner's global config.

## Completion Criteria

Scenario: harness runs both backends and writes the results table
  Test: grep -q "layerfs" .workflows/reviews/layerfs-bench.md && grep -q "git" .workflows/reviews/layerfs-bench.md
  Given the built or build-failed LayerFS state
  When the harness runs
  Then the results file contains a git section and a layerfs section with p50/p95 latency and disk columns

Scenario: git baseline matches the known order of magnitude
  Test: grep -qE "git.*(add|setup).*(p95|P95)" .workflows/reviews/layerfs-bench.md
  Given the git baseline measurements
  When the results table is inspected
  Then git setup p95 is at most 500 ms (39 ms measured baseline; noisy-machine ceiling)

Scenario: layerfs section records the build state
  Test: grep -qiE "build (ok|failed|aborted)" .workflows/reviews/layerfs-bench.md
  Given the LayerFS build attempt from the local checkout
  When the harness runs
  Then the results record the build outcome and toolchain, whatever they are

Scenario: records disk free before and after
  Test: grep -qiE "disk.*(before|after|free)" .workflows/reviews/layerfs-bench.md
  Given the run start and end
  When the harness reports
  Then free disk is recorded at both points

Scenario: cleans up workspaces after the run
  Test: bash scripts/bench-worktree-backend.sh --cleanup-only >/dev/null 2>&1
  Given any residue from an interrupted run
  When the cleanup mode runs
  Then git worktree list is clean and the script exits 0
