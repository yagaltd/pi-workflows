# Plan 20260822-009: pi-core-subagent 1.3.30 integration — worktree doctrine

Status: DRAFT

## Context

`pi update --extensions` installed 1.3.30, wiping our in-place patch and activating **worktree
isolation for write agents** (no opt-out): write-capable children run in
`<repo>/.git/subagents/<run>/<task>`, auto-commit to `subagents/*` branches, report branch +
diffstat; leader merges (`git merge --no-ff`). Six pi-workflows surfaces are now wrong or broken
(scout: `.workflows/scout/20260822-009-subagent-130-integration.md`, all grep-verified): the
worker/reviewer GUARDs (worktree toplevel ≠ repo path → every write-task GUARD fails), the
tripwire (S1/S2 read the dirty main tree → false ALARMs on every legitimate worktree task),
registry's "no worktrees" isolation section (factually false), execution-doctrine's shared-tree
wording + ship ritual (commits → merges), dispatch-shapes (8× removed `background:false`, no
merge step, reviewers verify the wrong surface), and our two upstream findings remain un-fixed
(explicit `input.tools` still narrowed by ambient file match; read-only file + `write:true`
still drops edit/write).

## Decisions

- **D1 — GUARD goes worktree-aware** (worker.md, reviewer.md, dispatch templates): the landing
  check accepts EITHER the repo's absolute root OR a `subagents/` worktree path under it
  (`<repo>/.git/subagents/...` — `git rev-parse --show-toplevel` returns the worktree path
  there). Repo-anchored still required: wrong repo in a worktree still BLOCKs/VOIDs.
- **D2 — Isolation doctrine rewritten**: native worktree isolation acknowledged (registry "no
  worktrees" section replaced); disjoint-Allowed-sets stays as **review hygiene + merge-cleanliness
  discipline** (same-file parallel writes = merge conflicts), no longer collision prevention.
- **D3 — Tripwire goes branch-aware** (verify-landing.sh): S1 passes when EITHER dirty Allowed
  paths exist OR a `subagents/*` branch carries a non-empty diff touching Allowed paths; S2
  claims checked against dirty tree ∪ branch diffstat; `--selftest` gains a worktree fixture
  case. Old behavior preserved for in-place tasks (non-git repos, read-only tasks).
- **D4 — Shapes + doctrine updated to 1.3.30 semantics**: `background:false` (8×) removed —
  background is the only mode, `autoAwait:true` when an inline result gates the next step;
  worker shapes note the extension's worktree contract (children are told their branch; no
  branch-switching git commands); reviewer shapes verify **branch diffs** (from subagent_result's
  branch+diffstat or `git diff <base>..<branch>`); ship ritual gains the merge step
  (`git merge --no-ff` per task branch, then commit).
- **D5 — Minimal patch re-applied, 1.3.30-adapted**: precedence fix only — explicit
  `input.tools` wins over file tools; write-guard (file tools lacking edit/write + `write:true`
  → ignore file tools, fall back to WRITE_TOOLS). `.orig` backups + diff artifact at
  `.workflows/patches/pi-core-subagent-1.3.30/`. Threshold + zero-tool WARN dropped (upstream
  score() clamps; worktree diffstat exposes empty results).
- **D6 — Upstream issue drafted** (text artifact, not submitted): both un-fixed findings,
  evidence chain (006 spike session JSONLs, 008 re-fire), the adapted patch as proposal.
- **D7 — Live verification through a fresh process** (T5, orchestrator-run): my session still
  holds in-memory 1.3.28+patch (split-brain, scout fact) — verification runs via a herdr child
  (fresh process → 1.3.30): one write task → worktree branch + diffstat reported → GUARD passes
  → tripwire branch-mode passes → merge lands clean → cleanup. Evidence into scout file.

## Spec Map

| Task | Contract | Wave | Model |
|---|---|---|---|
| T1 GUARD + isolation doctrine | task-guard-worktree.spec | 1 | @model:standard |
| T2 dispatch shapes → 1.3.30 | task-shapes-130.spec | 1 | @model:standard |
| T3 tripwire branch-aware + doctrine loop | task-tripwire-branch.spec | 1 | @model:standard |
| T4 patch re-apply + issue draft | task-patch-130.spec | 1 | @model:standard |
| T5 live verification (orchestrator-run) | task-live-verify-130.spec | 2 | parent + child |

Waves: T1 ∥ T2 ∥ T3 ∥ T4 (disjoint files) → T5. T5 gates the ship.

## Tasks

### TASK 1 (Tier B): GUARD worktree-aware + isolation doctrine
- **Agent**: worker (@model:standard/high) · **Contract**: task-guard-worktree.spec
- **What**: D1+D2 — GUARD blocks in agents/worker.md + agents/reviewer.md accept the worktree
  toplevel pattern; registry.md isolation section rewritten (native worktrees; disjoint rule
  re-labeled as merge-cleanliness discipline); GUARD anchor lines inside dispatch-shapes.md are T2's (T1 does NOT touch
  dispatch-shapes.md — disjoint-Allowed applies to our own plan: T1 = worker.md +
  reviewer.md + registry.md only).
- **Status**: ⬜ PENDING

### TASK 2 (Tier B): dispatch shapes → 1.3.30 semantics
- **Agent**: worker (@model:standard/high) · **Contract**: task-shapes-130.spec
- **What**: D4 — 8× `background:false` removed (background default; `autoAwait:true` note where
  inline results gate next steps); worktree contract notes in worker shapes; reviewer shapes
  gain branch-diff verification; ship/merge step documented in the wave shape; GUARD anchor
  lines in every shape updated to the worktree-aware form (this task owns ALL of
  dispatch-shapes.md).
- **Status**: ⬜ PENDING

### TASK 3 (Tier B): tripwire branch-aware + doctrine loop
- **Agent**: worker (@model:standard/high) · **Contract**: task-tripwire-branch.spec
- **What**: D3 — verify-landing.sh rework (S1/S2 branch-aware, selftest + worktree fixture);
  execution-doctrine.md: tripwire step wording (dirty-tree OR branch evidence), ship ritual
  merge step, consolidated-review wording, shared-tree statements updated. HARD INVARIANT:
  phantom detection never weakens — empty-diff branch + claimed done = ALARM, exactly as
  clean-tree + claimed done does today.
- **Status**: ⬜ PENDING

### TASK 4 (Tier B): patch re-apply (1.3.30-adapted) + upstream issue draft
- **Agent**: worker (@model:standard/high) · **Contract**: task-patch-130.spec
- **What**: D5+D6 — minimal precedence+write-guard patch on installed 1.3.30 (backups + diff
  artifact); issue-draft.md (findings, evidence, patch proposal — NOT submitted).
- **Status**: ⬜ PENDING

### TASK 5 (Tier C, orchestrator-run): live verification
- **Agent**: parent (herdr child = fresh 1.3.30 process) · **Contract**: task-live-verify-130.spec
- **What**: D7 — real write task through a herdr child: worktree branch + diffstat + GUARD +
  tripwire branch-mode + merge + cleanup, all verified; evidence to
  `.workflows/scout/009-live-verify.md`.
- **Status**: ⬜ PENDING

## Out of scope

- Submitting the upstream issue/PR (draft only — user's call).
- Re-running the wave-orchestrator spike (008 GO stands; worktrees only make it safer).
- pi-codex-goal EBADENGINE warning + npm audit findings (user-environment, not ours).
- MorphEditor/MorphClient doctrine (their .workflows share ours via pi-workflows skills —
  inherits automatically on next plan there).
