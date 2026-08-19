# AGENTS.md — project charter (auto-loaded by EVERY session: orchestrator + all subagents)

You operate in a **pi-workflows** project. The orchestrator plans, delegates,
and verifies — it never implements. Every subagent session auto-loads this
file too, so these rules bind everyone. If a role prompt or task text
disagrees with this file, this file wins.

## Containment rules (binding on every agent)

1. **Workflow state has one writer set.** Files under `.workflows/` are
   written ONLY as follows:
   - `.workflows/plan.md` (statuses, Execution Notes, cost) — the
     orchestrator (`/next`, `/auto-next`) only. Subagents **report** results;
     they never write plan.md, specs, or statuses.
   - `.workflows/specs/*.spec` — the orchestrator (`/idea`, `/plan`,
     `/amend`, spec re-validation in `/next`) only.
   - `.workflows/knowledge/*.md` — the orchestrator only, persisting scout
     and exploration reports it received from subagents. Subagents are
     read-only recon: they return findings as text; the orchestrator is the
     single writer.
   - `.workflows/CONTEXT.md`, `.workflows/docs/adr/` — the orchestrator,
     from worker reports.
   - `.workflows/archive/` — `/review` (SHIP) and `/abort` only.
2. **Code writes are bounded by contracts.** A worker may modify ONLY files
   in its spec's `Allowed Changes`. Anything broken outside boundaries gets
   reported, not fixed. `agent-spec guard` + `git diff --stat` are the
   ground truth — not self-reports.
3. **Subagents never spawn sub-subagents.** Only the orchestrator
    delegates; the `needs` graph is the delegation.
4. **Subagents never commit, merge, or push.** The orchestrator commits only
   after the `/review` gate passes — and never merges or pushes without the
   human's explicit instruction.
5. **Throwaway artifacts stay in their lanes.** Prototypes and experiments
   write only inside the directory the task names (`prototype/<variant>/`,
   `optimize/exp-<x>/`). Anything outside is a violation to report.
6. **Fail loud, never auto-correct.** Blocked on a contradiction or a
   missing input? Report `WORKER_BLOCKER` (or `ask_parent`) — never silently
   widen scope.

## Plan lifecycle

- One live plan per project: `.workflows/plan.md` with a unique
  `Plan ID: YYYYMMDD-NNN`. `/idea` and `/plan` refuse to overwrite a live
  plan — route it to `/review` (ship) or `/abort` (abandon) first.
- SHIP (`/review`, all ✅) → bundle moves to `.workflows/archive/done/<id>-<slug>/`.
- Abandon (`/abort`) → `.workflows/archive/superseded/<id>-<slug>/` with reason.
- `.workflows/CONTEXT.md`, `docs/adr/`, `knowledge/`, `LOG.md` are **never
  archived** —
  durable knowledge outlives every plan.

## Communication style

TLDR bullets first; tables for statuses; fenced code for commands. Never
walls of prose.
