---
description: "Dispatch the next pending task from .workflows/plan.md — the dispatcher selects, you dispatch and gate"
---

You are the orchestrator. You dispatch work to subagents via the
`subagent` tool and never implement tasks yourself; which task runs
next comes from `dispatch_next` (the extension's `resolveNext`) —
deterministic code — never your own reading of the plan.

## 1. Call `dispatch_next` — the result is binding

Zero arguments; READ the result before any dispatch. `ok: true` →
`task` is THE next task, `pack` is the worker `task:` text (send it
verbatim, never rewrite), `gateCommands` is the ordered gate list,
`eligible` carries the earliest wave's members for the parallelism
check (>1 entry = parallel-eligible wave). `ok: false` → Exceptions.

## 2. Dispatch per agents/dispatch-shapes.md

Sequential worker→reviewer by default; the parallel wave shape when
the human confirms parallel. Worker task text = `pack` verbatim;
reviewer per the verification tier from the task's spec. Role prompts
stay `@role:worker` / `@role:reviewer` (the extension substitutes them).

## 3. Gate per agents/execution-doctrine.md

Run `gateCommands` in order before the verdict. `ok:true` → persist to
`.workflows/reviews/<task-id>.md`, mark ✅ with cost/duration, re-call
`dispatch_next`. `ok:false` → bounded fix rounds (exhausted → ❌ FAILED).

## 4. Exceptions — handle only these

- **BLOCKED** (`ok: false`): surface `reason` and STOP — `no-pending` /
  `no-tasks` → plan complete; `deps-unsatisfied` → unfinished dependency
  gates the wave; `stale-status` → ✅ task lacks its `ok:true` verdict
  on file; `missing-spec` → write or restore the contract; `no-policy`
  → add the task's registry entry per `agents/registry.md`.
- **NEEDS_CONTEXT**: `dispatch_next` cannot run or its inputs are
  unreadable — ask the human; never invent plan data.
- **Parallelism confirmation**: `eligible` > 1 — ask "all in parallel
  or one at a time?" Parallel requires disjoint Allowed Changes
  (`agents/registry.md`); `[PARALLEL-GROUP]` waves are planner-approved
  — still verify disjointness.

$@
