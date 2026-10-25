spec: task
name: "Live-fire verification of the 1.3.30 worktree integration (fresh process)"
tags: [live-verify, worktree, herdr, orchestrator-run]
max-rounds: 4
---

## Intent

Prove the 1.3.30 integration works under the REAL installed code — worktree isolation, extension
auto-commit, branch+diffstat reporting, worktree-aware GUARD, tripwire branch mode, `--no-ff`
merge, cleanup — via ONE real tracked-file micro-task through a FRESH pi process (the parent
session holds in-memory 1.3.28 and cannot verify disk code; scout fact). Orchestrator-run:
herdr child (fresh process) dispatches one write-capable worker; evidence lands in
`.workflows/scout/009-live-verify.md`; any failed step = FAIL recorded honestly.

## Decisions

- D7 (plan 20260822-009), verbatim intent: fresh-process live verification through a herdr child
  (008 harness pattern: own workspace + tab + pane, `agent start --kind pi`, child model
  `deepseek/deepseek-v4-flash-0731`, 5-line summary back, `herdr workspace close` cleanup).
- Micro-task target: append EXACTLY ONE dated line to the END of README.md's Flow section (the
  established append point). Suggested literal:
  `2026-08-22 LIVE-VERIFY-130: worktree write landed (branch + diffstat reported, GUARD passed in-worktree).`
  Greps match the dated `LIVE-VERIFY-130` marker, not exact wording. `.workflows/LOG.md` is
  DISALLOWED as the target (gitignored → empty branch diff → tests would false-fail).
- The child's worker prompt carries: GUARD (worktree-aware form per T1), Allowed = README.md
  only, verify-after-edit, "execute tools, never describe them".
- Parent verifies after the wave: (a) a `subagents/*` branch exists with a non-empty diff
  touching exactly README.md; (b) the child's report shows branch + diffstat + the worker's
  GUARD passing inside the worktree + toolCalls > 0; (c) tripwire branch mode passes
  (`tooling/verify-landing.sh` with the branch, post-T3); (d) `git merge --no-ff <branch>` lands
  the README line in master; (e) cleanup: worktree dir removed post-merge, herdr workspace
  closed, zero server-level calls.
- REQUIRED-LITERALS for `.workflows/scout/009-live-verify.md`: exactly one `Live-verify: PASS|FAIL`
  line; a line containing `branch: ` with the branch name; a line containing `diffstat: `; a
  `merge: ` line; a `cleanup: ` line; a line containing `toolCalls: <int>`.
- Version provenance recorded in the evidence file: the grandchild ran under disk-installed
  `@arhen/pi-core-subagent` 1.3.30 (fresh process), not the parent's in-memory 1.3.28.

## Boundaries

### Allowed (execution-time surfaces — not the spec-drafter's)
- .workflows/scout/009-live-verify.md (evidence)
- README.md (the ONE micro-task line, landed via the merge)
- .workflows/LOG.md (orchestrator log entries)
- herdr runtime (transient workspace/tab/pane)

### Forbidden
- All other files — specs, agents/**, skills/**, tooling/**, tests/**, CHANGELOG.md
- More than ONE line in README.md; any non-merge writes to master by the parent

## Completion Criteria

Scenario: Evidence file with all literals
  Test: grep -c 'Live-verify: PASS\|Live-verify: FAIL' .workflows/scout/009-live-verify.md && grep -c 'branch: ' .workflows/scout/009-live-verify.md && grep -c 'diffstat: ' .workflows/scout/009-live-verify.md && grep -c 'merge: ' .workflows/scout/009-live-verify.md && grep -c 'cleanup: ' .workflows/scout/009-live-verify.md && grep -c 'toolCalls: ' .workflows/scout/009-live-verify.md
  Then exactly 1 verdict line; each other literal ≥1

Scenario: The README line landed via merge
  Test: git log --oneline -3 && grep -c 'LIVE-VERIFY-130' README.md
  Then the marker present in master via a merge commit (`--no-ff` visible in log); exactly 1 occurrence

Scenario: Branch existed and was merged
  Test: git branch --list 'subagents/*' | wc -l
  Then 0 remaining post-merge (auto-cleanup) — with the merge commit + branch name recorded in the evidence file

Scenario: Honest verdict
  Test: grep -E 'Live-verify: (PASS|FAIL)' .workflows/scout/009-live-verify.md
  Then exactly one; FAIL is a valid outcome (feeds fix round, never massaged); any FAIL carries reproduction steps

Verify: `grep -c 'Live-verify: PASS\|Live-verify: FAIL' .workflows/scout/009-live-verify.md | grep -q '^1$' && grep -q 'LIVE-VERIFY-130' README.md && git branch --list 'subagents/*' | wc -l | grep -q '^0$'`
