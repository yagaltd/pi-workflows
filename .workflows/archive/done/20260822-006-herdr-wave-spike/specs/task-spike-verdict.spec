spec: task
name: "006 wave-orchestrator spike verdict contract"
tags: [spike, verdict, evidence, herdr, wave-orchestrator]
max-rounds: 2
---

## Intent

Adjudicate the whole plan-006 spike with ONE contract, because the spike's sole deliverable is a verdict contract plus a verdict artifact: plan tasks 1–3 (recon/harness/live-fire) carry no per-task specs, and all of their evidence criteria live in this single verdict spec. The contract's execution-time edit surface is exactly two gitignored files — the verdict artifact `.workflows/scout/006-wave-orchestrator-verdict.md` (authored by the spike at execution time, NOT by this spec) and the one dated spike-note line the live-fire micro-task appends to `.workflows/LOG.md`. No production file changes regardless of outcome; NO-GO is a successful spike.

## Decisions

- **D-VERDICT (verbatim):** The spike's sole deliverable is a verdict contract + verdict artifact. ONE spec — task-spike-verdict.spec — adjudicates the whole spike plan (its evidence criteria cover recon/harness/run tasks; no other specs exist for this plan). The verdict artifact `.workflows/scout/006-wave-orchestrator-verdict.md` (written at execution time by the spike, NOT by the spec-drafter) must state GO or NO-GO with live evidence: (a) inventory facts with file:line anchors (pi-herdr extension surface; herdr-agent-state.ts; child pi profile/extension resolution for pi-core-subagent; agent.wait semantics verified vs pane.wait_for_output); (b) harness proof: child pi session spawned in its own herdr tab via CLI, running one wave via its own in-process subagent children, scoped to its own workspace, zero server-level calls; (c) live-fire: one real worker micro-task (append dated spike-note to .workflows/LOG.md, Allowed = that file only) dispatched by the child with dispatch artifacts + verdict; (d) context metric: parent-absorbed bytes vs child-absorbed await/report bytes, mechanically computed; (e) herdr cleanup done (tab.close + workspace teardown); (f) if GO, one-paragraph recommended production shape. NO-GO is a successful spike.

Operational details (each traceable to a scout fact or the decision's own text):

- **ONE verdict spec for the whole plan**: TASK 1 (inventory), TASK 2 (harness), TASK 3 (live-fire) are adjudicated only through this spec's evidence criteria; no second `.spec` may exist for plan 006 (`.workflows/plan-draft-006.md` "Spec Map" — TASK 1–3 rows: "Contract: none (… adjudicated via verdict spec evidence)").
- **Artifact path is fixed and spike-authored**: `.workflows/scout/006-wave-orchestrator-verdict.md`; written at execution time by the spike run, never by spec drafting (`.workflows/plan-draft-006.md` TASK 4 "What").
- **Evidence (a) — inventory with `file:line` anchors**: pi-herdr extension surface (`~/.pi/agent/settings.json:19` installs `npm:@ogulcancelik/pi-herdr`, unopened — scout `20260822-006-herdr-wave-orchestrator.md:10`); `herdr-agent-state.ts` (scout:11); child pi profile/extension resolution for pi-core-subagent — NOT parent-inherited (scout:52); `agent.wait` semantics (what it matches — agent-state vs output) verified against `pane.wait_for_output` fallback (scout:24, 32).
- **Evidence (b) — harness proof**: child pi session spawned via herdr CLI into its own tab; runs ONE wave through its own **in-process** subagent children (pi-core-subagent v1.3.28 — scout:45); scoped to its own workspace; **zero server-level calls** (`server.stop` and siblings are within CLI/socket reach — scout:54, blast-radius rule).
- **Evidence (c) — live-fire**: exactly ONE real worker micro-task — append a dated spike-note line to `.workflows/LOG.md` (Allowed = that file only) — dispatched by the CHILD, with the real dispatch artifacts + per-task verdict cited in the verdict (scratch dispatch rejected — scout:55 fake-work risk).
- **Evidence (d) — context metric**: parent-absorbed BYTES (the summary the parent reads) vs child-absorbed await/report BYTES (child's own log/artifacts), both mechanically computed (e.g. `wc -c`), replacing the fuzzy "token delta" (`.workflows/plan-draft-006.md` TASK 3 "What").
- **Evidence (e) — cleanup mandatory**: `herdr tab.close` + workspace teardown performed after the run, successful or not (`.workflows/plan-draft-006.md` TASK 3 "What").
- **Evidence (f) — GO shape**: if the verdict is GO, the artifact ends with a ONE-paragraph recommended production shape (`.workflows/plan-draft-006.md` TASK 4 "What").
- **NO-GO is a successful spike**: no criterion requires GO; completion is verdict-only (`D1` in `.workflows/plan-draft-006.md`).

## Boundaries

### Allowed Changes
- `.workflows/specs/task-spike-verdict.spec` — the ONE file this contract writes
- Execution-time spike surfaces only (declared by the plan, not writable by this contract): `.workflows/scout/006-wave-orchestrator-verdict.md` (spike author) and `.workflows/LOG.md` (the single dated spike-note line from the live-fire micro-task)

### Forbidden
- The verdict artifact path `.workflows/scout/006-wave-orchestrator-verdict.md` as a spec-drafting deliverable — the artifact is written ONLY by the spike at execution time
- Production code — anything outside `.workflows/` (walked in this plan: Tier C spike, zero production edits)
- Any other `.spec` — no second contract for plan 006, no per-task specs for recon/harness/run
- `README.md`, `CHANGELOG.md`, `agents/**`, `skills/**`, `scripts/**`, `models/**`, `tests/**`, `prompts/**`, `templates/**`, `tooling/**`, `extensions/**`, `.github/**`
- External-state mutation: `~/.pi/agent/settings.json`, the herdr install at `~/.local/bin/herdr`, herdr socket/daemon state, and any `server.*` herdr call from any child (blast-radius rule)

## Completion Criteria

Scenario: Whole-plan adjudication is exactly one verdict spec
  Test: `ls .workflows/specs/ | grep -c 'task-spike-verdict\.spec'`
  Given the plan-006 spike (recon TASK 1, harness TASK 2, live-fire TASK 3) carries no per-task contracts
  When the spike concludes
  Then `.workflows/specs/` contains exactly one spec for plan 006 — `task-spike-verdict.spec` — and its evidence criteria cover recon/harness/run (no other spec exists for this plan)

Scenario: Verdict artifact exists at the fixed path
  Test: `test -f .workflows/scout/006-wave-orchestrator-verdict.md`
  Given the spike run has completed (successful or not)
  When inspecting the gitignored scout area via the filesystem
  Then `.workflows/scout/006-wave-orchestrator-verdict.md` exists

Scenario: Verdict declares exactly one of GO / NO-GO
  Test: `grep -cE 'Verdict: (GO|NO-GO)' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given the artifact exists
  When scanning for the verdict line
  Then the count is exactly 1 — the artifact states GO or NO-GO, never both and never neither

Scenario: Inventory facts carry file:line anchors for the named surfaces
  Test: `grep -E '\.(ts|mjs|json|md):[0-9]+' .workflows/scout/006-wave-orchestrator-verdict.md | grep -E 'pi-herdr|herdr-agent-state|pi-core-subagent|agent\.wait|wait_for_output' | wc -l`
  Given the recon evidence section (clause a)
  When counting anchored inventory facts
  Then at least 4 lines pair one of the named surfaces (pi-herdr extension, herdr-agent-state.ts, pi-core-subagent resolution, agent.wait, pane.wait_for_output) with a `file:line` anchor

Scenario: pi-herdr extension surface inventoried from settings.json:19
  Test: `grep -q 'pi-herdr' .workflows/scout/006-wave-orchestrator-verdict.md && grep -q 'settings.json:19' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given the installed-but-unopened pi-herdr extension is the first inventory target (scout:10)
  When checking the artifact
  Then it names the pi-herdr extension surface and anchors it to `~/.pi/agent/settings.json:19`

Scenario: Child pi extension/profile resolution for pi-core-subagent is addressed
  Test: `grep -q 'pi-core-subagent' .workflows/scout/006-wave-orchestrator-verdict.md && grep -qE 'profile|config' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given extension availability depends on pi profile/config resolution, NOT parent inheritance (scout:52)
  When checking the artifact's inventory section
  Then it records how the child pi resolves pi-core-subagent via profile/config and confirms it is not inherited from the parent

Scenario: agent.wait semantics verified against pane.wait_for_output
  Test: `grep -q 'agent.wait' .workflows/scout/006-wave-orchestrator-verdict.md && grep -q 'pane.wait_for_output' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given herdr offers both agent-level wait and pane-level output wait (scout:24, 32)
  When checking the artifact
  Then it records the verified `agent.wait` semantics (what it matches — agent-state vs output) alongside the `pane.wait_for_output` fallback comparison

Scenario: Harness proof — own tab, own workspace, one wave, in-process children
  Test: `grep -q 'tab' .workflows/scout/006-wave-orchestrator-verdict.md && grep -q 'workspace' .workflows/scout/006-wave-orchestrator-verdict.md && grep -q 'in-process' .workflows/scout/006-wave-orchestrator-verdict.md && grep -qE 'one wave|ONE wave|single wave' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given the harness (clause b)
  When checking the artifact's harness evidence
  Then it documents: a child pi session spawned via herdr CLI into its own tab; scoped to its own workspace; running ONE wave through its own in-process subagent children

Scenario: Zero server-level calls recorded
  Test: `grep -qE 'server\.(stop|list|close|create)|server-level' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given CLI/socket grants `server.stop` and siblings (scout:54, blast-radius rule)
  When checking the artifact
  Then it explicitly records the child issued zero server-level calls — only pane/agent surface within its own workspace

Scenario: Live-fire evidence exists — outcome documented either way
  Test: `grep -cE '^20[0-9]{2}-[0-9]{2}-[0-9]{2} .*(SPIKE-006|spike-note)' .workflows/LOG.md || grep -q 'Live-fire verdict: FAIL' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given the live-fire micro-task appended a dated line to `.workflows/LOG.md` when it succeeded (Allowed = that file only)
  When inspecting LOG.md via the filesystem and the verdict artifact
  Then AMENDED (round 2, orchestrator): EITHER a dated live-fire line exists in LOG.md, OR the verdict artifact documents `Live-fire verdict: FAIL` with evidence — the decision requires the ATTEMPT plus artifacts and verdict, never a landed line (the original grep also pre-dated the task's actual line wording and could never match it)

Scenario: Live-fire dispatch artifacts + verdict cited in the artifact
  Test: `grep -q 'dispatch' .workflows/scout/006-wave-orchestrator-verdict.md && grep -q 'LOG.md' .workflows/scout/006-wave-orchestrator-verdict.md && grep -q 'Live-fire verdict: ' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given clause (c) requires the real dispatch artifacts and a per-task verdict
  When checking the artifact's live-fire section
  Then it cites the micro-task's dispatch artifacts, names `LOG.md` as the sole write target, and records a per-task verdict line

Scenario: Context metric — parent-absorbed vs child-absorbed bytes, both byte figures present
  Test: `grep -E 'parent-absorbed|child-absorbed' .workflows/scout/006-wave-orchestrator-verdict.md | grep -cE '[0-9]+ ?(bytes|B)'`
  Given clause (d)
  When counting byte figures
  Then at least 2 lines pair a labelled figure (parent-absorbed and child-absorbed await/report) with a numeric byte count

Scenario: Context metric — mechanical computation stated
  Test: `grep -qE 'wc -c|byte-count|mechanical' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given the metric must be mechanically computed, not estimated (clause d)
  When checking the artifact
  Then it states how the byte figures were computed (e.g. `wc -c` on the child-side logs vs the parent-read summary)

Scenario: herdr cleanup recorded — tab.close + workspace teardown
  Test: `grep -qE 'tab\.close|tab close' .workflows/scout/006-wave-orchestrator-verdict.md && grep -qE 'teardown|workspace close|workspace.*closed' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given cleanup is mandatory after the run, successful or not (clause e)
  When checking the artifact
  Then it records `herdr tab.close` plus workspace teardown having been performed

Scenario: GO implies a recommended production shape
  Test: `grep -q 'Verdict: GO' .workflows/scout/006-wave-orchestrator-verdict.md && grep -qE 'production shape|recommended' .workflows/scout/006-wave-orchestrator-verdict.md || grep -q 'Verdict: NO-GO' .workflows/scout/006-wave-orchestrator-verdict.md`
  Given clause (f)
  When the verdict is GO
  Then the artifact ends with a one-paragraph recommended production shape
  And if the verdict is NO-GO, no production shape is required (the alternative branch passes)

Scenario: NO-GO is a successful spike outcome
  Test: `grep -qE 'Verdict: (GO|NO-GO)' .workflows/scout/006-wave-orchestrator-verdict.md && test -f .workflows/scout/006-wave-orchestrator-verdict.md`
  Given NO-GO is a successful spike (no criterion demands GO)
  When the verdict resolves to NO-GO
  Then completion is still met — the sole deliverable (verdict artifact) exists and declares NO-GO; no criterion anywhere requires GO

Scenario: No stray artifacts — specs/ and scout/ hold exactly the expected files
  Test: `ls .workflows/specs/ | grep -c '\.spec' ; ls .workflows/scout/ | grep -c '006-wave-orchestrator-verdict'`
  Given the spike touches only gitignored paths, verified via the filesystem (never git status)
  When listing both directories post-run
  Then AMENDED (round 2, orchestrator): `.workflows/specs/` contains exactly the one SPIKE spec (`task-spike-verdict.spec`) and `.workflows/scout/` contains the verdict artifact — sibling specs from post-draft plan amendments (`task-thinking-maps.spec`, added by the +T6 amendment) are outside spike scope and do not count as strays

Verify: `test -f .workflows/scout/006-wave-orchestrator-verdict.md && grep -cE 'Verdict: (GO|NO-GO)' .workflows/scout/006-wave-orchestrator-verdict.md | grep -q '^1$'` (AMENDED round 2: live-fire outcome adjudicated by the amended C10 either-way rule)