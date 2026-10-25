# Plan: wave-orchestrator re-spike (008) — production-shaped child wave

> Plan ID: 20260822-008
> Status: DONE
> Created: 2026-08-22
> Shape: pi-workflows plan-draft (house format), ≤110 lines.

## Context

Scout 008 re-spikes the 006 wave-orchestrator pattern (NO-GO, but harness+economics proven: TUI child in herdr tab+pane, 100:1 context compression ~$0.03/wave) at production shape. The NO-GO hinged on ONE depth-2 bug: live-fire workers executed **zero tools** yet reported ✓ success; root cause = agent-file precedence (ambient match overrode `write:true`).

**Bug now fixed + live-proven**: 007 re-fire — depth-2 child→grandchild write task ran **2 tools, 3 turns, line landed, $0.0037, friction none** vs 0-tool fake-success pre-patch (`.orig` backups, `WARN: zero tool calls`, `MIN_MATCH_SCORE` ×3; fix at `.workflows/patches/pi-core-subagent-1.3.28/` — scout:008).

**Open question this spike answers**: does the pattern hold at PRODUCTION shape — ONE child orchestrator running ONE real multi-task wave: 2 parallel Tier-A workers (disjoint Allowed sets) + a reviewer on `needs:` edges (006 ran single-task waves ×2 only) — with tool-count assertions in the child (006's live-fire gap)?

**Real work (no manufactured)**: (1) git-dirty whitelist rule, absent today — `skills/plan/SKILL.md:250` scopes the rule but NO whitelist (`M .workflows/LOG.md`, `M .workflows/plan.md`, `?? .workflows/specs/*.spec`); (2) `templates/CONTRACT-FORMAT.md` gains the same criterion (grep zero hits — scout:008). Disjoint, Tier A.

**Outcome**: GO ⇒ wave-delegation dispatch shape + the two real edits land; NO-GO = successful spike.

## Decisions

- **D1 — Re-spike, not fresh exploration.** 006 proved harness+economics; re-prove the ONE broken link (deep tool succession) at wave scale (scout:008).
- **D2 — Model: flash-0731 for child + all wave workers.** strong pro-0813 = 4/4 length-deaths on build-heavy tasks (analysis-only); flash-0731 = all-day build workhorse (scout: model routing).
- **D3 — Wave = the two REAL Tier-A ledger items, parallel, disjoint Allowed** (worker A: skills/plan/SKILL.md; worker B: templates/CONTRACT-FORMAT.md) + reviewer on `needs:` edges — house doctrine carried by the child's prompt (scout: constraints).
- **D4 — One spec for the whole spike**: `.workflows/specs/task-respike-verdict.spec` — verdict contract pattern + REQUIRED-LITERALS block (006's task-spike-verdict.spec precedent) so the child emits exact strings.
- **D5 — Orchestrator-run tasks are parent-run Tier C, marked orchestrator-run**; the reviewer+verdict task is the child's one deliverable.
- **D6 — Metrics (006-metrics method)**: parent-absorbed bytes vs child-absorbed bytes (session JSONL `wc -c`) — ratio re-measured at wave scale; wall-clock; per-task verdicts; cost.
- **D7 — Blast radius = one herdr workspace; zero server-level calls (006 D3); mandatory `herdr workspace close` cleanup (scout: constraints).**
- **D8 — Failure path**: task failing inside the child ⇒ record fix-attempt vs escalate (evidence only, not a gate) (scout: open question #4).

## Spec Map

| Task | Contract | Wave | Model @model: refs |
|------|----------|------|--------------------|
| T1 harness (parent-run) | task-respike-verdict.spec (spawn prompt) | gate | @model:standard |
| T2 worker A (Tier A) | same spec — Allowed: skills/plan/SKILL.md | 1 | @model:standard |
| T3 worker B (Tier A) | same spec — Allowed: templates/CONTRACT-FORMAT.md | 1 | @model:standard |
| T4 reviewer+verdict (in-child) | same spec — verdict deliverable | 2 | @model:standard |
| T5 final adjudication (parent-dispatched, depth-1) | same spec — independent gate | 3 | @model:strong |

## Tasks

### TASK 1 (Tier C): Harness bring-up — orchestrator-run (parent)
- **Agent**: parent (herdr CLI/pi-herdr)
- **Contract**: spawn prompt from task-respike-verdict.spec
- **What**: create herdr workspace (own tab+pane, `agent start --kind pi`), spawn child pi with the wave prompt (carrying REQUIRED-LITERALS + worker/reviewer dispatch details from the spec), track lifecycle via `agent.wait`; on completion the PARENT measures both metric sides (parent-absorbed = parent's read bytes; child-absorbed = child session JSONL `wc -c`) → `.workflows/scout/008-metrics.md`; cleanup workspace.
- **Status**: ⬜ PENDING

### TASK 2 (Tier A): Worker A — git-dirty whitelist rule (child)
- **Agent**: child's in-process subagent (unnested from parent)
- **Contract**: .spec — Allowed: skills/plan/SKILL.md:250 area
- **What**: enumerate the pre-dispatch whitelist in the task-scoped git-dirty rule: `M .workflows/LOG.md`, `M .workflows/plan.md`, `?? .workflows/specs/*.spec`. Verify-after-edit per doctrine.
- **Status**: ⬜ PENDING

### TASK 3 (Tier A): Worker B — git-status criterion in CONTRACT-FORMAT (child)
- **Agent**: child's in-process subagent
- **Contract**: .spec — Allowed: templates/CONTRACT-FORMAT.md
- **What**: add the same git-status/whitelist criterion to the template (drives future spec-drafter output). Disjoint file set from TASK 2.
- **Status**: ⬜ PENDING

### TASK 4 (Tier C): Reviewer-in-child + verdict — child deliverable
- **Agent**: reviewer node + child's final analysis
- **Contract**: verdict doc — per-task verdicts (state + tool counts), REQUIRED-LITERALS present verbatim, compact summary ≤5 lines to parent; tool-count check against session JSONL before emitting (006 live-fire guard).
- **What**: review wave via `needs:` edges (worker verdicts with tool counts — the 006 live-fire guard); record failure path if any worker failed; author the verdict artifact IN-CHILD (the point: analysis cost absorbed by the child, parent pays the ≤5-line summary); REQUIRED-LITERALS emitted verbatim per the spawn prompt.

### TASK 5 (Tier B): Final adjudication — parent-dispatched, depth-1
- **Agent**: reviewer (@model:strong/high) · **Contract**: task-respike-verdict.spec
- **What**: independent gate (adversarial-pass ruling: no model marks its own work done — the child's self-verdict is NOT the plan's verdict): adjudicate every spec criterion against the landed artifacts (verdict doc, metrics, the two edits' diffs, child wave report); verify the two production edits within their Allowed sets; never ok:true with findings.
- **Status**: ⬜ PENDING
- **Status**: ⬜ PENDING

## Out of scope
- Committing the two edits (GO recommendation lands them later, via dispatch shape)
- Editing dispatch-shapes.md (recommendation only, no file changes)
- Zero server-level calls; upstream depth-2 fix stays unsubmitted (006 constraint)
- pi-herdr extension internals (verified in 006; reuse, don't re-invent)