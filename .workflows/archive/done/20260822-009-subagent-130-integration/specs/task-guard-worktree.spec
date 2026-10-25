spec: task
name: "worktree-aware GUARD + native worktree isolation"
tags: [docs, worker, reviewer, registry, guard, worktree, isolation]
max-rounds: 2
---

## Intent

The landing checks in the worker and reviewer roles stop assuming an in-process, shared-filesystem child: with native 1.3.30 worktrees, `git rev-parse --show-toplevel` returns the worktree path, so the guard must accept our own repo's worktree (under `<repo>/.git/subagents/`) while STILL rejecting a wrong repo — and the registry's isolation policy must describe the new native-worktree model instead of the old contract-boundary one.

## Decisions

- D1 (verbatim): "The GUARD landing checks in agents/worker.md and agents/reviewer.md become worktree-aware: the check passes when `git rev-parse --show-toplevel` equals the repo's absolute root OR any path under `<repo>/.git/subagents/` (the 1.3.30 worktree pattern — toplevel returns the worktree path there). Repo identity stays strict: a worktree of the WRONG repo still blocks/VOIDs."
  - Operational detail: both `pwd` and `git rev-parse --show-toplevel` must match the absolute repo path named in the task text's first line (unchanged), OR `--show-toplevel` must start with the prefix `<repo>/.git/subagents/` (this repo's own worktree). The `pwd` half still must equal the repo root.
  - WORKER_BLOCKER format (agents/worker.md) and the VOID line (agents/reviewer.md) survive verbatim for the wrong-repo / wrong-dir case (scout: worker.md "Step 0 — GUARD" pins the absolute repo path; reviewer.md:9-17 VOID semantics).
- D2 (verbatim): "Registry's '## Isolation policy (no worktrees)' section is rewritten for native worktree isolation (write children run isolated at `.git/subagents/<run>/<task>`, branch `subagents/<run>/<task>`, extension auto-commits + reports branch+diffstat, leader merges); the disjoint-Allowed-sets rule is re-labeled as merge-cleanliness/review hygiene (same-file parallel writes = merge conflicts), no longer collision prevention."
  - Operational detail: the section title's "(no worktrees)" qualifier is removed; the section describes native worktrees with the exact path/branch/commit/report/merge mechanics above; the disjoint-Allowed-sets bullet is reworded so its rationale is merge conflicts / review hygiene, not preventing fs collisions.
  - The dispatcher/extension mechanics live in dispatch-shapes.md, NOT to be touched here (dispatch-shapes.md is T2's; forbidden).

## Boundaries

### Allowed Changes
- agents/worker.md
- agents/reviewer.md
- agents/registry.md

### Forbidden
- Everything else: agents/dispatch-shapes.md (T2's), agents/execution-doctrine.md (T3's), skills/**, .workflows/**, README, tooling/**, extension code.

## Completion Criteria

Scenario: Worker GUARD is worktree-aware
  Test: grep -n "git rev-parse --show-toplevel" agents/worker.md
  Given the updated worker role
  Then its Step 0 GUARD has a pass condition covering `--show-toplevel` equal to the repo root OR any path under `<repo>/.git/subagents/`

Scenario: Reviewer GUARD is worktree-aware
  Test: grep -n "git rev-parse --show-toplevel" agents/reviewer.md
  Given the updated reviewer role
  Then its Step 0 GUARD accepts this repo's own worktree (toplevel under `<repo>/.git/subagents/`) as correct-landing

Scenario: Wrong-repo worktree still blocked / VOID (repo identity strict)
  Test: grep -i "VOID" agents/reviewer.md
  Then the reviewer still emits the one-line `VOID — wrong working directory (<found> ≠ <expected>)` when the landing is a wrong repo (including a wrong repo's worktree — toplevel not under this repo's root or `.git/subagents/`)
  Test: grep "WORKER_BLOCKER" agents/worker.md
  Then the worker still emits its WORKER_BLOCKER for the same wrong-repo case, verbatim shape preserved

Scenario: Isolation policy retitled away from "(no worktrees)"
  Test: grep -n "## Isolation policy" agents/registry.md
  Test: grep -n "(no worktrees)" agents/registry.md
  Then the section header no longer carries the "(no worktrees)" qualifier (its title describes native worktrees instead)

Scenario: Native worktree mechanics described
  Test: grep -n "subagents/<run>" agents/registry.md
  Then the rewritten section names the child-isolation path `.git/subagents/<run>/<task>` and the branch `subagents/<run>/<task>`
  Test: grep -n "diffstat" agents/registry.md
  Then the section says the extension auto-commits the worktree branch and reports the branch + diffstat

Scenario: Leader merges stated
  Test: grep -i "leader" agents/registry.md
  Then the rewrite states the leader merges the worktree branch back

Scenario: Disjoint rule re-labeled as hygiene, not collision prevention
  Test: grep -n "merge-cleanliness" agents/registry.md
  Then the rule is re-labeled as merge-cleanliness / review hygiene (same-file parallel writes = merge conflicts) — its rationale is merge conflicts, not filesystem collision prevention

Scan: No scope creep beyond the three allowed files
  Test: ls agents/worker.md agents/reviewer.md agents/registry.md
  Then these are the ONLY files changed — no dispatch-shapes.md, execution-doctrine.md, skills/**, .workflows/**, or README edits (check via `git diff --stat -- agents/` and confirm only the three)