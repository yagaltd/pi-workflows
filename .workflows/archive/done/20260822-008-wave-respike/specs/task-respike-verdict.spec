spec: task
name: "008 wave re-spike verdict contract"
tags: [spike, verdict, evidence, wave, herdr, respike]
max-rounds: 2
---

## Intent

Adjudicate the whole D-RESPIKE plan with ONE contract, because the re-spike's sole deliverable is a verdict contract + a verdict artifact + two real production edits (landing as uncommitted diffs, committed at ship iff GO): the wave's tasks carry no per-task specs, and all of their evidence criteria live in this single verdict spec. The contract's execution-time surface is exactly the two gitignored artifacts — the in-child-authored verdict `.workflows/scout/008-wave-respike-verdict.md` and the parent-measured metrics `.workflows/scout/008-metrics.md` — plus the two real production edits `skills/plan/SKILL.md` and `templates/CONTRACT-FORMAT.md` made by the child's wave workers. The child's self-verdict is evidence, never the plan's verdict: a parent-dispatched depth-1 reviewer (T5) re-runs this contract's criteria against disk and its result is final. No production file changes beyond the two named edits regardless of outcome; NO-GO is a successful spike.

## Decisions

- **D-RESPIKE (verbatim):** The re-spike's deliverable is a verdict contract + verdict artifact + two real production edits (landing as uncommitted diffs, committed at ship if GO). ONE spec — task-respike-verdict.spec — adjudicates the whole plan: (a) harness proof at wave scale: child pi (TUI, herdr-hosted, own workspace, flash-0731) runs ONE multi-task wave — 2 parallel Tier-A workers (disjoint Allowed: worker A → skills/plan/SKILL.md git-dirty whitelist enumeration; worker B → templates/CONTRACT-FORMAT.md same criterion rule) + a reviewer on needs-edges, ALL in-child; (b) tool-count guard: every wave task's toolCalls > 0 (session-JSONL-verified — the 006 live-fire gap); (c) the two edits land correctly within Allowed sets (grep-able whitelist strings in both files); (d) verdict artifact `.workflows/scout/008-wave-respike-verdict.md` authored IN-CHILD with REQUIRED-LITERALS: exactly one `Verdict: (GO|NO-GO)` line, per-task verdict lines with tool counts, `parent-absorbed` and `child-absorbed` byte figures on separate lines, wave wall-clock, cost, failure-path section (or 'none'), cleanup evidence; (e) metrics file `.workflows/scout/008-metrics.md` parent-measured (both sides, wc -c method); (f) GO ⇒ production-shape recommendation paragraph (wave-delegation dispatch shape), NO-GO ⇒ next-step paragraph; NO-GO is a successful spike. Blast radius: own workspace, zero server-level calls, mandatory workspace cleanup. Final adjudication is a parent-dispatched depth-1 reviewer (T5) — the child's self-verdict is evidence, never the plan's verdict.

Operational details (each traceable to a scout fact or the decision's own text):

- **ONE verdict spec for the whole plan**: the wave, its two workers, the reviewer, and the two edits are adjudicated only through this spec's evidence criteria; no second `.spec` may exist for D-RESPIKE.
- **Artifact paths fixed**: verdict `.workflows/scout/008-wave-respike-verdict.md` authored at execution time IN-CHILD (`.workflows/scout/20260822-008-wave-respike.md` open questions — multi-task wave, reviewer-in-child, economics at scale, failure path all report here); metrics `.workflows/scout/008-metrics.md` measured by the PARENT (006 metrics method: child session JSONL `wc -c` vs parent read bytes, `.workflows/scout/006-metrics.md`).
- **Evidence (a) — harness at wave scale**: child pi must be TUI-in-pane — print-mode children are invisible to herdr lifecycle (herdr-agent-state.ts:228, `.workflows/scout/006-inventory.md` §2) — so the child runs herdr-hosted via `herdr agent start --kind pi` (§4), in its OWN workspace (blast-radius rule, 006 D3), model `deepseek/deepseek-v4-flash-0731` (registry routes, scout 008). ONE multi-task wave = a single `tasks[]` call with 2 parallel Tier-A workers (disjoint Allowed, wave doctrine — `skills/plan/SKILL.md:75`) + one reviewer on the `needs:` edges, ALL running inside the child via in-process subagent children (pi-core-subagent in-process, `.workflows/scout/006-inventory.md` §3).
- **Evidence (a) — the two real edits (real work, not manufactured)**: worker A (Allowed = `skills/plan/SKILL.md` only) adds git-dirty whitelist enumeration — the ledger item flagged by 006 C7 and 005 CC6: spec git-dirty criteria must whitelist pre-dispatch dirty files (`M .workflows/LOG.md`, `M .workflows/plan.md`, the plan's own `?? .workflows/specs/*.spec`); `skills/plan/SKILL.md:250` today has the task-scoped rule but NO whitelist enumeration (scout 008, grep-verified). Worker B (Allowed = `templates/CONTRACT-FORMAT.md` only) adds the same criterion rule to the template — today it has zero git-status criterion guidance (scout 008: grep zero hits for git status/whitelist).
- **Evidence (b) — tool-count guard**: every wave task's `toolCalls` > 0, verified mechanically from the child's session JSONL (the 006 live-fire gap: 006's workers executed ZERO tools while the runtime reported success; the child caught it via session-JSONL tool counts — `.workflows/scout/006-metrics.md`, `.workflows/scout/006-wave-orchestrator-verdict.md`). The verdict artifact carries the per-task counts; a zero-tool task is a FAILURE and forces NO-GO.
- **Evidence (c) — edits land**: both files contain the new grep-able whitelist strings (zero hits in both files at scout time — clean markers); both edits remain UNCOMMITTED (commit happens at ship iff GO, outside this contract).
- **Evidence (d) — verdict artifact REQUIRED-LITERALS** (block below is normative; the in-child author must match these exactly — round-2 lesson: grep literals must match what authors will actually write).
- **Evidence (e) — metrics parent-measured**: `.workflows/scout/008-metrics.md` records both sides' byte figures computed by the parent via `wc -c`, never estimated.
- **Evidence (f) — verdict shapes**: GO ⇒ artifact ends with a ONE-paragraph recommended production shape (the wave-delegation dispatch shape — the missing dispatch-shapes.md entry, scout 008 open question 5); NO-GO ⇒ artifact ends with a next-step paragraph. NO-GO is a successful spike; no criterion demands GO.
- **Blast radius**: own workspace only; zero `server.*` calls from any child (CLI/socket reachability, 006 inventory §2 — zero server-level calls assertion, 006 D3); mandatory cleanup `herdr workspace close <id>` after the run, successful or not; `.workflows/` is gitignored — all `.workflows/`-path criteria verify via the filesystem, never git status; any git criterion is task-scoped to the two named production files.
- **Final adjudication**: the parent dispatches a depth-1 reviewer (T5) who re-executes this contract's Test lines against disk; the plan's verdict is the reviewer's, and the child's self-verdict in the artifact is treated strictly as evidence to be re-verified.

### REQUIRED-LITERALS (normative — must appear verbatim in `.workflows/scout/008-wave-respike-verdict.md`)

```text
1. Exactly ONE line matching: Verdict: (GO|NO-GO)        — never both, never neither
2. Per-task verdict lines, each containing: toolCalls: <int>
       (e.g. "Task worker-a: GO (4 toolCalls)" / "Task worker-b: FAIL (toolCalls: 0)");
       <int> is that wave task's session-JSONL-mechanized tool-call count
3. A line starting: parent-absorbed: <bytes>            — on ITS OWN line
4. A line starting: child-absorbed: <bytes>             — on ITS OWN line, NEVER the same
       line as parent-absorbed
5. A line starting: wall-clock: <duration>              — wave dispatch→settle figure
6. A "## Cost" section containing a dollar figure ($...) — wave cost
7. A "## Failure path" section — body is the literal "none" when no failure occurred,
       otherwise the failing condition + evidence
8. The literal: zero server-level calls                  — blast-radius assertion
9. A cleanup line containing: herdr workspace close <id> — with the result,
       e.g. → {"type":"ok"}
10. A wave-count phrase: "ONE multi-task wave" (or "one/single multi-task wave") in the
       harness section; the child ran exactly ONE wave, not several
11. NO-GO artifact ends with a "## Next step" paragraph (or a line containing
       "next-step") — GO artifacts need no next-step paragraph
12. GO artifact ends with a paragraph containing "production shape" (or
       "production-shape") — the wave-delegation dispatch-shape recommendation
```

For `.workflows/scout/008-metrics.md` (parent-measured): must contain the literals `parent-measured`, `parent-absorbed`, `child-absorbed`, and `wc -c`.

## Boundaries

### Allowed Changes
- `.workflows/specs/task-respike-verdict.spec` — the ONE file this contract writes
- Execution-time surfaces only (declared by the plan, not writable by this contract):
  - `.workflows/scout/008-wave-respike-verdict.md` — authored by the CHILD wave at execution time
  - `.workflows/scout/008-metrics.md` — measured by the PARENT
  - worker A's edit target: `skills/plan/SKILL.md` (Allowed for worker A = that file only) — git-dirty whitelist enumeration
  - worker B's edit target: `templates/CONTRACT-FORMAT.md` (Allowed for worker B = that file only) — same criterion rule

### Forbidden
- Any other `.spec` — no second contract for D-RESPIKE, no per-task specs for the wave/workers/reviewer
- The verdict artifact and metrics paths as spec-drafting deliverables — written ONLY at execution time by the child wave (verdict) and the parent (metrics)
- Production code beyond the two named files: any other path under `skills/`, `templates/`, `README.md`, `CHANGELOG.md`, `agents/**`, `scripts/**`, `tests/**`, `prompts/**`, `models/**`, `tooling/**`, `extensions/**`, `.github/**`, `dispatch-shapes.md` (the GO paragraph only RECOMMENDS the wave-delegation shape; no shape file is authored in this spike)
- Any other `.workflows/` path — including `.workflows/LOG.md` and `.workflows/plan.md` — as wave write targets
- Committing the two production edits during the spike — they stay uncommitted until ship iff GO
- External-state mutation: `~/.pi/agent/settings.json`, the pi-herdr / pi-core-subagent installs, herdr socket/daemon state, and any `server.*` herdr call from any child (blast-radius rule)

## Completion Criteria

Scenario: Whole-plan adjudication is exactly one verdict spec
  Test: `test "$(ls .workflows/specs/ | grep -cx 'task-respike-verdict\.spec')" -eq 1`
  Given the D-RESPIKE wave (harness, two workers, reviewer, two edits) carries no per-task contracts
  When the re-spike concludes
  Then `.workflows/specs/` contains exactly one spec for D-RESPIKE — `task-respike-verdict.spec` — and its evidence criteria cover harness/workers/reviewer/edits (no other spec exists for this plan)

Scenario: Verdict artifact exists at the fixed path
  Test: `test -f .workflows/scout/008-wave-respike-verdict.md`
  Given the spike run has completed (successful or not)
  When inspecting the gitignored scout area via the filesystem
  Then `.workflows/scout/008-wave-respike-verdict.md` exists

Scenario: Verdict declares exactly one of GO / NO-GO
  Test: `test "$(grep -cE 'Verdict: (GO|NO-GO)' .workflows/scout/008-wave-respike-verdict.md)" -eq 1`
  Given the artifact exists
  When scanning for the verdict line
  Then the count is exactly 1 — the artifact states GO or NO-GO, never both and never neither

Scenario: Harness proof — TUI-in-pane, own workspace, flash-0731, all in-child
  Test: `grep -q 'flash-0731' .workflows/scout/008-wave-respike-verdict.md && grep -q 'TUI' .workflows/scout/008-wave-respike-verdict.md && grep -q 'own workspace' .workflows/scout/008-wave-respike-verdict.md && grep -q 'in-child' .workflows/scout/008-wave-respike-verdict.md`
  Given the harness (clause a) requires child pi = TUI, herdr-hosted, own workspace, flash-0731, ALL in-child
  When checking the artifact's harness evidence
  Then it documents the child as a TUI pi in its own herdr workspace, model flash-0731, and records that the whole wave ran in-child (006 gate: print-mode children invisible — herdr-agent-state.ts:228)

Scenario: Harness proof — ONE multi-task wave, 2 parallel workers, reviewer on needs-edges
  Test: `grep -qE 'ONE multi-task wave|one multi-task wave|single multi-task wave' .workflows/scout/008-wave-respike-verdict.md && grep -q 'parallel' .workflows/scout/008-wave-respike-verdict.md && grep -q 'reviewer' .workflows/scout/008-wave-respike-verdict.md && grep -q 'needs' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (a) specifies exactly ONE multi-task wave with 2 parallel Tier-A workers plus a reviewer on the needs-edges
  When checking the artifact
  Then it records: one multi-task wave, 2 parallel workers, and a reviewer wired on the needs-edges

Scenario: Worker Allowed mapping — both edit targets cited with disjoint Allowed
  Test: `grep -q 'skills/plan/SKILL.md' .workflows/scout/008-wave-respike-verdict.md && grep -q 'templates/CONTRACT-FORMAT.md' .workflows/scout/008-wave-respike-verdict.md`
  Given the wave doctrine requires disjoint Allowed sets per worker (worker A → skills/plan/SKILL.md; worker B → templates/CONTRACT-FORMAT.md)
  When checking the artifact
  Then it names both real edit targets and their per-worker assignments

Scenario: Tool-count guard — per-task toolCalls counts, session-JSONL sourced
  Test: `test "$(grep -cE 'toolCalls: [0-9]+' .workflows/scout/008-wave-respike-verdict.md)" -ge 2 && grep -qE '\.jsonl|session' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (b) — every wave task's toolCalls verified from the child's session JSONL (the 006 live-fire gap)
  When checking the artifact
  Then each wave task (≥2) has a verdict line carrying a numeric `toolCalls:` count, and the artifact cites the session JSONL (or session) as the count's source

Scenario: GO never coexists with a zero-tool wave task (either-way)
  Test: `(grep -q 'Verdict: GO' .workflows/scout/008-wave-respike-verdict.md && ! grep -qE 'toolCalls: 0' .workflows/scout/008-wave-respike-verdict.md) || grep -q 'Verdict: NO-GO' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (b) makes toolCalls > 0 a hard guard — a zero-tool task is a failure
  When the verdict is GO
  Then no wave task shows `toolCalls: 0`
  And a NO-GO verdict with documented zero-tool evidence is a successful route (REQUIRED-LITERALS 2 — `toolCalls: 0` is valid artifact content on the failure route)

Scenario: NO-GO implies a documented failure path (either-way)
  Test: `(grep -q 'Verdict: NO-GO' .workflows/scout/008-wave-respike-verdict.md && grep -q '## Failure path' .workflows/scout/008-wave-respike-verdict.md) || grep -q 'Verdict: GO' .workflows/scout/008-wave-respike-verdict.md`
  Given a NO-GO verdict must be evidence-backed, never a bare rejection
  When the verdict is NO-GO
  Then the artifact contains a `## Failure path` section explaining which condition failed

Scenario: Failure-path section present — body is 'none' or documents the failure
  Test: `grep -q '## Failure path' .workflows/scout/008-wave-respike-verdict.md && (grep -q 'none' .workflows/scout/008-wave-respike-verdict.md || grep -qE 'toolCalls: 0|FAIL|failed' .workflows/scout/008-wave-respike-verdict.md)`
  Given clause (d) requires a failure-path section (or 'none')
  When checking the artifact
  Then the section exists and its body is either the literal `none` or the documented failing condition with evidence

Scenario: REQUIRED-LITERALS — parent/child-absorbed byte figures on separate lines
  Test: `grep -q 'parent-absorbed:' .workflows/scout/008-wave-respike-verdict.md && grep -q 'child-absorbed:' .workflows/scout/008-wave-respike-verdict.md && ! grep -qE 'parent-absorbed.*child-absorbed|child-absorbed.*parent-absorbed' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (d) — byte figures on SEPARATE lines
  When checking the artifact
  Then both labelled byte figures are present and no single line contains both labels

Scenario: REQUIRED-LITERALS — wave wall-clock
  Test: `grep -q 'wall-clock:' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (d) requires the wave wall-clock
  When checking the artifact
  Then a `wall-clock:` line carries the wave dispatch→settle duration

Scenario: REQUIRED-LITERALS — cost
  Test: `grep -q '## Cost' .workflows/scout/008-wave-respike-verdict.md && grep -q '\$[0-9]' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (d) requires wave cost
  When checking the artifact
  Then a `## Cost` section contains a dollar figure

Scenario: Metrics file — parent-measured, both sides, wc -c method
  Test: `test -f .workflows/scout/008-metrics.md && grep -q 'parent-measured' .workflows/scout/008-metrics.md && grep -q 'wc -c' .workflows/scout/008-metrics.md && grep -q 'parent-absorbed' .workflows/scout/008-metrics.md && grep -q 'child-absorbed' .workflows/scout/008-metrics.md`
  Given clause (e) — metrics file parent-measured, both sides, wc -c method (006-metrics.md precedent)
  When inspecting the metrics file
  Then it exists, states it is parent-measured, records both parent-absorbed and child-absorbed figures, and cites the `wc -c` computation method

Scenario: Edit A — git-dirty whitelist enumeration lands in skills/plan/SKILL.md
  Test: `grep -q 'whitelist' skills/plan/SKILL.md`
  Given worker A's real task: SKILL.md:250 has the task-scoped rule but NO whitelist enumeration (scout 008, grep-verified zero 'whitelist' hits pre-spike)
  When checking the edit target
  Then `skills/plan/SKILL.md` now contains the literal `whitelist` (the enumeration requirement is present)

Scenario: Edit B — same criterion rule lands in templates/CONTRACT-FORMAT.md
  Test: `grep -q 'whitelist' templates/CONTRACT-FORMAT.md && grep -q 'git' templates/CONTRACT-FORMAT.md`
  Given worker B's real task: the template has zero git-status criterion guidance pre-spike (scout 008, grep-verified)
  When checking the edit target
  Then `templates/CONTRACT-FORMAT.md` now contains both the literal `whitelist` and the literal `git` (the same criterion rule is present)

Scenario: Both edits land as uncommitted diffs, task-scoped to exactly the two files
  Test: `test "$(git diff --name-only -- skills/plan/SKILL.md templates/CONTRACT-FORMAT.md | wc -l)" -eq 2`
  Given clause (c) — the two real edits land as uncommitted diffs (committed only at ship iff GO, outside this contract)
  When checking via git diff, task-scoped to the two named files
  Then both `skills/plan/SKILL.md` and `templates/CONTRACT-FORMAT.md` appear as uncommitted modified paths (count == 2)

Scenario: Blast radius — cleanup recorded, zero server-level calls
  Test: `grep -q 'herdr workspace close' .workflows/scout/008-wave-respike-verdict.md && grep -q 'zero server-level calls' .workflows/scout/008-wave-respike-verdict.md`
  Given the blast-radius invariants: mandatory own-workspace cleanup and zero server-level calls from any child
  When checking the artifact
  Then it records `herdr workspace close <id>` with its result and asserts `zero server-level calls`

Scenario: GO implies a recommended production shape
  Test: `(grep -q 'Verdict: GO' .workflows/scout/008-wave-respike-verdict.md && grep -qE 'production shape|production-shape' .workflows/scout/008-wave-respike-verdict.md) || grep -q 'Verdict: NO-GO' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (f) — GO ⇒ one-paragraph recommended production shape (the wave-delegation dispatch shape, missing from dispatch-shapes.md)
  When the verdict is GO
  Then the artifact ends with a production-shape recommendation paragraph
  And if the verdict is NO-GO, no production shape is required (the alternative branch passes)

Scenario: NO-GO implies a next-step paragraph; NO-GO is a successful spike outcome
  Test: `(grep -q 'Verdict: NO-GO' .workflows/scout/008-wave-respike-verdict.md && grep -qiE 'next step|next-step' .workflows/scout/008-wave-respike-verdict.md) || grep -q 'Verdict: GO' .workflows/scout/008-wave-respike-verdict.md`
  Given clause (f) — NO-GO ⇒ next-step paragraph (REQUIRED-LITERALS 11); NO-GO is a successful spike (no criterion anywhere demands GO)
  When the verdict is NO-GO
  Then completion is still met — the deliverable exists, declares NO-GO, and ends with a next-step paragraph
  And the artifact's Verdict line plus artifact existence alone satisfy completion (`grep -qE 'Verdict: (GO|NO-GO)' .workflows/scout/008-wave-respike-verdict.md && test -f .workflows/scout/008-wave-respike-verdict.md`)

Scenario: No stray artifacts — spike-scoped check
  Test: `test "$(ls .workflows/scout/ | grep -cx '008-wave-respike-verdict.md')" -eq 1 && test "$(ls .workflows/scout/ | grep -cx '008-metrics.md')" -eq 1`
  Given the spike touches only gitignored paths, verified via the filesystem (never git status)
  When listing the scout area post-run
  Then the two respike deliverables exist exactly once each (AMENDED round-2 lesson, spike-scoped: sibling specs/files from any post-draft plan amendments are outside spike scope and do not count as strays)

Scenario: Final adjudication is the parent-dispatched depth-1 reviewer (T5)
  Test: `test -f .workflows/scout/008-wave-respike-verdict.md && test "$(grep -cE 'Verdict: (GO|NO-GO)' .workflows/scout/008-wave-respike-verdict.md)" -eq 1 && test -f .workflows/scout/008-metrics.md && grep -q 'whitelist' skills/plan/SKILL.md && grep -q 'whitelist' templates/CONTRACT-FORMAT.md && test "$(git diff --name-only -- skills/plan/SKILL.md templates/CONTRACT-FORMAT.md | wc -l)" -eq 2`
  Given the child's self-verdict in the artifact is evidence, never the plan's verdict
  When the parent adjudicates
  Then the parent dispatches a depth-1 reviewer (T5) who re-executes this contract's Test lines against disk (amalgam above); the plan's verdict is the reviewer's re-verification, never the child's self-report alone

Verify: `test -f .workflows/scout/008-wave-respike-verdict.md && test "$(grep -cE 'Verdict: (GO|NO-GO)' .workflows/scout/008-wave-respike-verdict.md)" -eq 1 && test -f .workflows/scout/008-metrics.md && grep -q 'whitelist' skills/plan/SKILL.md && grep -q 'whitelist' templates/CONTRACT-FORMAT.md && test "$(git diff --name-only -- skills/plan/SKILL.md templates/CONTRACT-FORMAT.md | wc -l)" -eq 2`