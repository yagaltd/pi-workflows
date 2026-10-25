spec: task
name: "Dispatch shapes to 1.3.30 worktree semantics"
tags: [docs, dispatch-shapes, subagent, worktree, 1.3.30]
max-rounds: 2
---

## Intent

agents/dispatch-shapes.md is the normative subagent-dispatch template file loaded by /next, /auto-next, /audit, /review. The pi-core-subagent 1.3.30 upgrade — which made worktree isolation mandatory for write children and removed blocking mode — invalidated several constructs in it: 8× `background:false`, reviewers verifying the clean shared tree (misreading every write task under worktrees), and a missing branch-merge ship step. This task migrates the WHOLE file to 1.3.30 semantics. Its edit point is every line of agents/dispatch-shapes.md.

## Decisions

**D4 (verbatim)** — agents/dispatch-shapes.md updated to 1.3.30 semantics — this task owns the WHOLE file: (1) all 8 `background: false` occurrences removed (background is the only mode; where a shape needs the result inline, `autoAwait: true` replaces it — e.g. the sequential worker→reviewer shape's note line 52); (2) worker shapes note the worktree contract: write-capable children are told their branch by the extension (no branch-switching git commands from children; the extension commits on completion); (3) reviewer shapes gain branch-diff verification — for write tasks, verify `git diff <base>..<branch>` (branch+diffstat arrive in the worker's result) instead of the shared dirty tree; read-only tasks keep tree/dirty verification; (4) the wave shape documents the ship step: after verdicts, the orchestrator merges each write task's branch (`git merge --no-ff subagents/<run>/<task>`) before the ship commit; (5) every GUARD anchor line in the shapes uses the worktree-aware form.

Operational details, each traceable to a scout fact:

1. **Blocking mode is gone** (scout `20260822-009-subagent-130-integration.md:21`: "`background:false` is gone; `autoAwait:true` replaces it"). The 8 occurrences sit at dispatch-shapes.md lines 23, 64, 119, 147, 165, 194, 240 (call sites) + note line 52. Remove every `background` token, prose reference included. Where a settled result gates the next step, set `autoAwait: true` on the subagent call — for a multi-task graph call this awaits the whole graph. Line 52's note becomes: with `autoAwait: true`, the call returns when the whole graph settles.
2. **Worktree contract, worker shapes** (scout `:12-13`): add a note stating the extension's contract — a write-capable child runs in `<repo>/.git/subagents/<run>/<task>` on branch `subagents/<run>/<task>`; the extension tells the child its branch before work; the child runs NO branch-switching git commands (no checkout/switch to it); the extension auto-commits the child's changes at completion.
3. **Reviewer shapes verify branch diffs for write tasks, dirty tree for read-only tasks** (scout `:13`, `:43-44`): a write task's result arrives with branch + diffstat, so the reviewer runs `git diff <base>..<branch>` for write tasks instead of checking a shared dirty tree; read-only tasks (in-place children) keep tree/dirty verification. Both reviewer prompts (sequential review + wave verify) carry this wording.
4. **Wave ship step**: in the parallel wave shape's Notes, document that after verdicts the orchestrator merges each write task's branch with `git merge --no-ff subagents/<run>/<task>` before the ship commit (scout `:13-14`).
5. **GUARD lines worktree-aware**: all 9 `Repo: <absolute repo path> (GUARD: ...)` anchor lines — the lines at 28, 37, 70, 78, 87, 166, 200, 212, 245 in the current file — must accept toplevel equal to the repo's absolute root OR a `<repo>/.git/subagents/**` worktree toplevel (scout `:30-32`: a worktree child's toplevel IS the worktree path; repo-anchored still required). Suggested form:
   `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).`

Structural fixed-invariants (scout `:41`; dispatch-shapes@14-245):
- All 7 `## ` shape headings, the balanced code blocks, the `subagent({` ... `})` graph/block shapes, and the GUARD/verbatim-role (`@role:` + paste-fallback) rules survive.
- The 005-added shapes — Spec drafting fan-out (was @184) and Plan draft delegation (was @233) — and the Live-smoke shape survive untouched in function. No content is removed from the scout, bug-hunter, live-smoke, drafting, or plan-draft shapes beyond the `background` field removal and the GUARD form change.

## Boundaries

### Allowed Changes
- agents/dispatch-shapes.md (whole file — this task's exclusive territory)

### Forbidden
- agents/worker.md, agents/reviewer.md, agents/registry.md (T1's territory)
- agents/execution-doctrine.md (T3's territory)
- tooling/**, skills/**, .workflows/**, extensions/**, tests/**, README.md, package.json

## Completion Criteria

Scenario: Blocking mode removed file-wide (D4-1)
  Test: grep -c "background" agents/dispatch-shapes.md
  Given 1.3.30 removed blocking mode (scout …integration.md:21)
  When the whole file is migrated
  Then the count is 0 — all 8 former occurrences (lines 23, 64, 119, 147, 165, 194, 240, 52) are gone, prose references included

Scenario: autoAwait replaces every former blocking call site (D4-1)
  Test: grep -c "autoAwait: true" agents/dispatch-shapes.md
  Given every former call site needed its settled result inline
  When each is migrated (sequential, wave, scout, bug-hunter, live-smoke, drafting fan-out, plan-draft)
  Then the count is ≥ 7 (one `autoAwait: true` per former blocking call)

Scenario: Sequential note reworded to whole-graph settle (D4-1, note line 52)
  Test: grep -c "whole graph settles" agents/dispatch-shapes.md
  Given the old note (line 52) said the call returns when the whole graph settles
  When it is migrated to autoAwait semantics
  Then the sentence survives in the sequential shape's Notes (≥ 1) and references `autoAwait: true`

Scenario: Worktree contract note is documented (D4-2)
  Test: grep -c "Worktree contract" agents/dispatch-shapes.md
  Given write-capable children run in worktrees (scout…integration.md:12-13)
  When the worker shapes document the extension's contract
  Then the file contains ≥ 1 "Worktree contract" note stating: the extension tells the child its branch, the child runs no branch-switching git commands, and the extension commits on completion

Scenario: Workers are branch-told and never switch (D4-2)
  Test: grep -c "branch-switching" agents/dispatch-shapes.md
  Given a child must not flip to (or off) its own branch
  Then the contract note carries the "branch-switching" prohibition (≥ 1)
  And: grep -c "subagents/<run>/<task>" agents/dispatch-shapes.md ≥ 2 — the branch the extension assigns (and later merges) is named twice or more

Scenario: Reviewer verifies write-task branch diffs (D4-3)
  Test: grep -c "git diff <base>..<branch>" agents/dispatch-shapes.md
  Given write work lands on the child's branch and leaves the shared tree clean (scout…:13, 34, 43)
  Then the reviewer wording — in BOTH the sequential review prompt and the wave verify prompt — runs `git diff <base>..<branch>` for write tasks (≥ 1 occurrence)

Scenario: Worker results surface branch + diffstat (D4-3)
  Test: grep -c "diffstat" agents/dispatch-shapes.md
  Given the extension reports branch + diffstat in each worker's result (scout…:13)
  Then the reviewer wording notes branch + diffstat arrive in the worker's result (≥ 1)

Scenario: Read-only tasks keep dirty-tree verification (D4-3)
  Test: grep -c "read-only" agents/dispatch-shapes.md
  Given read-only children run in-place (no worktree), so their shared tree stays authoritative
  Then the reviewer wording pairs read-only tasks with dirty-tree verification (read-only ≥ 1)
  And: grep -c "dirty" agents/dispatch-shapes.md — "dirty" tree verification survives (≥ 1)

Scenario: Wave shape documents the ship/merge step (D4-4)
  Test: grep -c "git merge --no-ff subagents/<run>/<task>" agents/dispatch-shapes.md
  Given each write task lands on a `subagents/<run>/<task>` branch for the orchestrator to merge
  When all wave verdicts pass
  Then the wave shape's Notes document the orchestrator merging each write task's branch with that exact command before the ship commit (≥ 1 occurrence)

Scenario: Every GUARD anchor line is worktree-aware (D4-5)
  Test: grep -c "GUARD:" agents/dispatch-shapes.md
  Given the worktree child's toplevel IS the worktree path, not the repo root (scout…:30-32)
  Then the count is 9 — all pre-existing GUARD anchor lines (28, 37, 70, 78, 87, 166, 200, 212, 245) survive
  And: grep "GUARD:" agents/dispatch-shapes.md | grep -c "subagents" — every GUARD line names the accepted `<…>/.git/subagents/**` toplevel (count 9)

Scenario: Shape/heading structure survives (fixed-invariant)
  Test: grep -c "^## " agents/dispatch-shapes.md
  Given the shapes are normative templates loaded by /next, /auto-next, /audit, /review
  Then the count is 7 and each of these exact headings is present (Verify loop): "Sequential worker", "Parallel worker wave", "Scout dispatch shape", "Bug-hunter dispatch shape", "Live-smoke dispatch shape", "Spec drafting fan-out", "Plan draft delegation"
  And: grep -c '^```' agents/dispatch-shapes.md is even (balanced fences)
  And: the `subagent({` count equals the `^})` count in agents/dispatch-shapes.md (whole call blocks)

Scenario: 005-added shapes and live-smoke keep their posture (fixed-invariant)
  Test: grep -c "Output EXACTLY one file: .workflows/specs" agents/dispatch-shapes.md
  Then ≥ 2 (both drafting-fan-out task prompts name their spec)
  And: grep -c "Output EXACTLY one file: .workflows/plan-draft-<id>.md" ≥ 1 and grep -c "off-limits" ≥ 1 (plan-draft stays a proposal-only shape)
  And: grep -c "smoke-<task-id>.md" ≥ 1 and grep -c "verdict" ≥ 1 (live-smoke keeps its evidence rendezvous and verdict gate)

Scenario: Role-convention rules preserved (fixed-invariant)
  Test: grep -c "@role:<name>" agents/dispatch-shapes.md
  Given the intro / GUARD/verbatim rules are normative
  Then the count is ≥ 1, and every `@role:` reference in the file still resolves (see Verify, `scripts/check-drift.sh`)

Scenario: Repo checks stay green (regression)
  Test: ./scripts/check-drift.sh
  When the migration is complete
  Then the drift checker exits 0 (no dead frontmatter keys, no removed API tokens, all @role references and agent files resolve)

Verify: bash -e '
  test "$(grep -c "background" agents/dispatch-shapes.md)" -eq 0 &&
  test "$(grep -c "autoAwait: true" agents/dispatch-shapes.md)" -ge 7 &&
  test "$(grep -c "whole graph settles" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "Worktree contract" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "branch-switching" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "subagents/<run>/<task>" agents/dispatch-shapes.md)" -ge 2 &&
  test "$(grep -c "git diff <base>..<branch>" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "diffstat" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "read-only" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "dirty" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "git merge --no-ff subagents/<run>/<task>" agents/dispatch-shapes.md)" -ge 1 &&
  test "$(grep -c "GUARD:" agents/dispatch-shapes.md)" -eq 9 &&
  test "$(grep -c "subagents" <(grep "GUARD:" agents/dispatch-shapes.md))" -eq 9 &&
  test "$(grep -c "^## " agents/dispatch-shapes.md)" -eq 7 &&
  for h in "Sequential worker" "Parallel worker wave" "Scout dispatch shape" "Bug-hunter dispatch shape" "Live-smoke dispatch shape" "Spec drafting fan-out" "Plan draft delegation"; do
    grep -q "$h" agents/dispatch-shapes.md || echo "MISSING heading: $h"
  done &&
  test "$(( $(grep -c "^```" agents/dispatch-shapes.md) % 2 ))" -eq 0 &&
  test "$(grep -c "subagent({" agents/dispatch-shapes.md)" -eq "$(grep -c "^})" agents/dispatch-shapes.md)" &&
  test "$(grep -c "Output EXACTLY one file: .workflows/specs" agents/dispatch-shapes.md)" -ge 2 &&
  grep -q "Output EXACTLY one file: .workflows/plan-draft-<id>.md" agents/dispatch-shapes.md &&
  test "$(grep -c "smoke-<task-id>.md" agents/dispatch-shapes.md)" -ge 1 &&
  ./scripts/check-drift.sh
'