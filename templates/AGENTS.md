# AGENTS.md — pi-workflows project charter (auto-loaded by EVERY session: orchestrator + all subagents)

The orchestrator plans, delegates, verifies — never implements. This file
binds every session (subagents auto-load it). On conflict with any role
prompt or task text, this file wins.

## Containment (binding)

1. **`.workflows/` has one writer set** — subagents report, they never write state:
   - `plan.md` (statuses, Execution Notes) — orchestrator only (`/next`, `/auto-next`)
   - `specs/*.spec` — orchestrator only (`/idea`, `/plan`, `/amend`, `/next` re-validation)
   - `reviews/*.md` — orchestrator only: reviewer verdicts, appended per round
   - `knowledge/*.md`, `research/**` — orchestrator only, persisting subagent reports
   - `CONTEXT.md`, `docs/adr/` — orchestrator only, from worker Domain Memory reports
   - `archive/` — `/review` (SHIP) and `/abort` only
2. **Code writes are bounded by contracts** — a worker touches only its spec's
   `Allowed Changes`; anything broken outside gets reported, not fixed.
   `agent-spec guard` + `git diff --stat` are the ground truth, not self-reports.
3. **No sub-subagents.** Only the orchestrator delegates; the `needs` graph is the delegation.
4. **Subagents never commit, merge, or push.** The orchestrator commits only
   after `/review` passes; never merges/pushes without explicit human instruction.
5. **Throwaway artifacts stay in their lanes** (`prototype/<variant>/`,
   `optimize/exp-<x>/`; `/brainstorm` writes only `research/` + `knowledge/`).
6. **Fail loud, never auto-correct** — blocked → `WORKER_BLOCKER` (or
   `ask_parent`), never silently widen scope.
7. **No model marks its own work done** — `✅` only from a reviewer verdict
   `ok:true` (mechanical before judgment). Rejections trigger bounded fix
   rounds (spec `max-rounds`, default 2) with the rejection evidence passed
   verbatim; reviewers verify, never fix.

## Docs discipline

README changes land in the **same task** as the behavior change;
CHANGELOG.md is appended **only at /review SHIP** (orchestrator-written,
workers never touch it); docs describe current state — history never
leaks into them (full policy: `templates/DOCS-POLICY.md` in the
pi-workflows package).

## Plan lifecycle

One live plan per project: `.workflows/plan.md` with a unique
`Plan ID: YYYYMMDD-NNN`. `/idea` and `/plan` refuse to overwrite a live
plan — route it to `/review` (SHIP → `archive/done/`) or `/abort`
(→ `archive/superseded/`) first. `CONTEXT.md`, `docs/adr/`, `knowledge/`,
`research/`, `LOG.md` are never archived — durable knowledge outlives every plan.

## Communication

TLDR bullets first; tables for statuses; fenced code for commands.
