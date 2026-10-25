spec: task
name: "tooling/verify-landing.sh worktree-aware tripwire + execution-doctrine loop/ship wording"
tags: [tooling, tripwire, bash, anti-phantom, worktree, branch, doctrine]
max-rounds: 3
---

## Intent

Make the landing tripwire branch-aware: write tasks that landed on a per-task git branch (1.3.30 worktree isolation, `subagents/*` namespace) must be verified as real work without ever weakening phantom detection, and execution-doctrine's loop/ship/final-review wording must track the new worktree reality.

## Decisions

D3 — tooling/verify-landing.sh goes branch-aware AND agents/execution-doctrine.md's loop/ship wording follows. HARD INVARIANT: phantom detection never weakens — empty-diff branch + claimed done = ALARM exactly as clean-tree + claimed done does today. Tripwire changes: S1 passes when EITHER dirty Allowed paths exist in the main tree OR a `subagents/*` branch exists whose diff vs its base is non-empty AND touches the task's Allowed paths; S2 claims-vs-reality checks claimed files against the dirty tree ∪ the branch diffstat (a claimed file in neither = ghost ALARM); old in-place behavior fully preserved (non-git repos → same as today; read-only tasks → dirty-tree path). CLI shape: accept optional `--branches <glob>` (default `subagents/*`) so the orchestrator passes the run's branch namespace; selftest gains a branch-fixture case (real temp git repo: create branch with commit → S1 PASS via branch; branch with zero diff + claimed done → ALARM). Doctrine edits: the loop's tripwire step accepts branch evidence (dirty tree OR branch diff); ship ritual gains the merge step (`git merge --no-ff` per write-task branch BEFORE the ship commit); 'consolidated final review' wording: parallel waves no longer share one tree — each write task's branch diff is its review surface, the full-tree review at plan end stays the review of record; shared-tree statements updated to branch reality.

### Operational details (traceable)

- **D3a — CLI shape.** `verify-landing.sh [--branches <glob>] <repo> <allowed>...` with claimed paths on stdin. `--branches` optional; when present its value immediately follows the flag and both are consumed before `<repo>`; absent ⇒ `branches="subagents/*"`. `--selftest` stays the first-arg gate, unchanged. `--branches` with no value ⇒ ALARM + exit 2 (malformed).
- **D3b — S1 evidence is an OR, never an AND.** Passes when EITHER (i) `git status --porcelain -uall -- <allowed>` over the main tree is non-empty (today's path, byte-unchanged), OR (ii) ≥1 local branch matching the glob has a non-empty diff vs its base that touches the task's Allowed paths. The branch path is a **superset of evidence for allowed paths where the write landed**, never a relaxation: if neither source shows an allowed-scoped change → `ALARM [S1]` + exit 1.
- **D3c — base resolution for a branch's diff.** The branch's base is `git merge-base <branch> HEAD` (= the branch's divergence point from the currently-checked-out main branch). The branch diffstat is `git diff --name-status <base>..<branch> -- <allowed>` (name-status surfaces added+modified; works for a pure-forward branch carved off HEAD). A branch with zero diff (created but no commits ahead) must count as empty — see the hard-invariant case.
- **D3d — branch enumeration.** `set -- $(git branch --list --format='%(refname:short)' '<glob>')` scoped to `refs/heads/`; skip the currently-checked-out branch (the tripwire targets *other* tasks' branches; the main tree's own writes come through the existing tree path). Enumerate ALL matching branches, not merely the first, so the union (D3e) sees every branch's diffstat.
- **D3e — S2 union (claims-vs-reality).** A claimed path passes if it appears in the main-tree status **or** in ≥1 matching branch's allowed-scoped diffstat. Build `union_set = status_output_lines ∪ all-branch diffstat_file_lines`. A claimed path absent from the union → `ALARM [S2]` + exit 1 (ghost). Identical spirit to today's `grep -qF "$f" <<<"$status"`, extended to the branch set.
- **D3f — HARD INVARIANT.** An empty-diff branch (created but zero committed work) + claimed done MUST emit the same `ALARM [S1]` as a clean main tree + claimed done does today. The `ALARM` message must still contain `zero diff` in BOTH the clean-tree path and the empty-branch path, so the existing selftest grep (`ALARM.*zero diff`) and operator tooling keep matching. Branch existence alone never satisfies S1 — only a non-empty allowed-scoped branch diff does.
- **D3g — old in-place behavior fully preserved.** Non-repo / inaccessible repo → `ALARM` + exit 2, stage-BEFORE any branch logic (branch logic requires a git repo). Read-only tasks → main-tree dirty path only (no claimed-landing on a branch); the dirty-tree OR-branch arrival never downgrades what today's dirty-tree check already passes.
- **D3h — magnitude line (branch-aware).** When a branch supplies the S1 evidence, the informational magnitude line lands on the branch diffstat (addition/deletion totals + new-file count scoped to allowed paths) with an explicit branch marker, keeping the `OK [S1]: work landed` line shape so existing detection stays greppable. Never fails (S3).
- **D3i — selftest: extend, never replace.** Keep the four existing cases (clean→`ALARM` rc1, landed→`OK` rc0, phantom-claim→`ALARM [S2]` rc1, non-repo→`ALARM` rc2) byte-unmodified from today. Add four branch fixture cases (D3j), each building a real temp git repo: `--selftest` CLI settled; exit 0 only if all pass; one `PASS:` line per case.
- **D3j — new selftest cases (branch fixtures).**
  1. `branch-landed` — temp git repo; commit a change to an allowed path on a branch named `subagents/<run>/<task>` (default glob match), checked-out back to clean main tree. → S1 PASS **via branch evidence**, rc 0, `OK [S1]` line (plus S2 `OK` when claimed path names the committed file).
  2. `branch-empty` — temp git repo with a branch `subagents/<run>/<empty>` at base with zero diff + a done claim. → `ALARM [S1]` "zero diff", rc 1 (HARD INVARIANT).
  3. `branch-ghost-claim` — temp git repo with a `subagents/<run>/<task>` branch whose committed diff does NOT include the claimed path (claim is in neither tree nor branch diffstat). → `ALARM [S2]` ghost, rc 1.
  4. `branch-namespace` — temp git repo with a branch OUTSIDE the default glob (e.g. `other/ns/task`) that touches an allowed path. Default `subagents/*` run → `ALARM [S1]` rc 1 (outside-namespace branch is not evidence, no weaker phantom detection); the same fixture re-run with `--branches 'other/*'` → rc 0 `OK [S1]` through the flag.
- **D3k — doctrine: tripwire bullet.** Update the loop diagram line (`ok:true → orchestrator runs tooling/verify-landing.sh <repo> <allowed>...`) AND the Tripwire rules bullet to `tooling/verify-landing.sh --branches subagents/* <repo> <allowed>...` + the statement that the tripwire accepts branch evidence: S1 passes on dirty main tree OR an allowed-scoped non-empty task branch; ALARM consequence (report untrusted → verify cwd → redispatch with explicit per-task cwd) unchanged.
- **D3l — doctrine: ship ritual merge step.** Add to the **Plan lifecycle & await economy** ship ritual: before the ship commit, `git merge --no-ff` each write-task branch in the run's namespace into the main branch (per-task `--no-ff` commits document the wave). Do NOT disturb the Status-line single-writer rule, the archive-to-`.workflows/archive/done/<plan-id>/specs/` step, or the await-loop economy rules in that section.
- **D3m — doctrine: consolidated-final-review wording.** Replace the shared-one-worktree/union-noise rationale: parallel waves no longer share a single tree; each write task's branch diff is its review surface (reviewers guard against the task's own branch, not a shared tree); the full-tree review at plan end remains the review of record. Remove the now-false "parallel waves share one worktree" premise wherever it recurs in this file; any working statement that implied shared in-place parallel writes is updated to branch reality.
- **D3n — hygiene.** `tooling/verify-landing.sh` stays executable and `bash -n` clean; the repo-wide commit gate/CI scans the tree on every commit, so a broken parse or dropped executable bit fails the push — the selftest must stay runnable in that gate.

## Boundaries

### Allowed Changes
- tooling/verify-landing.sh — branch-aware tripwire (CLI `--branches`, S1 branch evidence OR, S2 union, branch-fixture selftest cases)
- agents/execution-doctrine.md — tripwire bullet + ship ritual + consolidated-final-review + shared-tree→branch wording

### Forbidden (scope carve-outs)
- agents/registry.md, agents/worker.md, agents/quality-reviewer.md (= tasks run by a different spec/T1)
- agents/dispatch-shapes.md (= T2's file)
- Everything else: skills/**, .workflows/**, README, tests/**, any other agent file, any other file.
- Do not disturb the Plan-lifecycle Status/archive/await-economy rules in agents/execution-doctrine.md beyond the added ship-ritual merge step.

## Completion Criteria

(*criterion Tests are `grep`-able / runnable; run against the final-edit tree. The selftest is the authoritative runner for the fixture scenarios*)

Scenario: S1 passes via branch evidence
  Test: tooling/verify-landing.sh --selftest (case: branch-landed)
  Given a fixture git repo where a `subagents/...` branch holds a commit touching an allowed path and the main tree is clean
  When the script runs with the default `subagents/*` branch glob
  Then the selftest reports `PASS: branch-landed`, exit 0 — the *same* setup that today yields "zero diff" ALARM now passes ONLY because the branch diff is non-empty and allowed-scoped

Scenario: HARD INVARIANT — empty-diff branch + claimed done = ALARM
  Test: tooling/verify-landing.sh --selftest (case: branch-empty)
  Given a fixture with a created branch `subagents/...` carrying zero diff and a done claim on stdin
  When the script runs
  Then `PASS: branch-empty` — `ALARM [S1]` rc 1 containing `zero diff`, indistinguishable in spirit from today's clean-tree ALARM; branch existence alone never satisfies S1

Scenario: S2 ghost through the branch union
  Test: tooling/verify-landing.sh --selftest (case: branch-ghost-claim)
  Given a fixture whose branch diff does NOT include the stdin-claimed path (absent from both tree status and branch diffstat)
  Then `PASS: branch-ghost-claim` — `ALARM [S2]`.

Scenario: --branches namespace respected
  Test: tooling/verify-landing.sh --selftest (case: branch-namespace)
  Given a fixture with a branch outside `subagents/*` that touches allowed paths
  When run with the default glob → an outside-namespace branch is NOT evidence → S1 ALARM rc 1
  Then re-run the same repo with `--branches 'other/*'` → rc 0 → `PASS: branch-namespace` — a non-namespace branch is not evidence without the flag, and the flag makes it count (no weaker detection)

Scenario: existing selftest behavior preserved
  Test: tooling/verify-landing.sh --selftest
  Given the four original fixtures (clean→rc1, landed→rc0, phantomclaim→rc1, non-repo→rc2)
  Then the selftest still prints all four `PASS:` lines and aggregates `exit 0`; added/kept behaviors never removed

Scenario: script hygiene
  Test: bash -n tooling/verify-landing.sh && test -x tooling/verify-landing.sh
  Then the script parses clean and keeps its executable bit — the commit-gate/CI scans it repo-wide on push

Scenario: tripwire accepts branch evidence (doctrine)
  Test: grep -F "--branches" agents/execution-doctrine.md ; grep -F "subagents/" agents/execution-doctrine.md
  Then the loop's tripwire line and Tripwire bullet invoke `tooling/verify-landing.sh --branches subagents/* ...` and state S1 = dirty main tree OR allowed-scoped non-empty task branch; ALARM consequence (report untrusted → verify cwd → redispatch) unchanged

Scenario: ship ritual merge step (doctrine)
  Test: grep -i "merge --no-ff" agents/execution-doctrine.md
  Then the ship-ritual section documents `git merge --no-ff` per write-task branch (BEFORE the ship commit); Status single-writer rule, archive-to-done step, and await-economy rules remain untouched

Scenario: consolidated final review wording (doctrine)
  Test: grep -i "review of record" agents/execution-doctrine.md ; grep -c "union-noise" agents/execution-doctrine.md ; grep -c "share one worktree" agents/execution-doctrine.md
  Then each write task's branch diff is named the per-task review surface with the full-tree plan-end review still the review of record; the shared-`worktree`/union-noise phrasing is gone (`-c` == 0 for both), and any shared-state statement is updated to branch reality

Scenario: no second spec and scope-hold
  Given the two-Allowed-file boundary (tooling/verify-landing.sh + agents/execution-doctrine.md only)
  Then `git diff` (task-scoped) shows changes in only those two files; nothing else touched
  Verify: git diff --stat task-scoped-dirt; bash -n tooling/verify-landing.sh passes (post-final-edit re-run)