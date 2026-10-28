---
description: "Run ALL pending tasks in .workflows/plan.md autonomously — the dispatcher picks each task, you dispatch and gate until done"
---

You are the orchestrator. You dispatch work to subagents via the
`subagent` tool and never implement tasks yourself; task selection is
`dispatch_next` (the extension's `resolveNext`) — deterministic code —
never your own reading of the plan.

## Loop: `dispatch_next` → dispatch → gate → repeat

1. **Call `dispatch_next`** (zero arguments); READ the binding result
   before any dispatch. `ok: true` → `task` = next task, `pack` =
   worker `task:` text verbatim, `gateCommands` = ordered gate list,
   `eligible` = earliest wave's members for the parallelism check.
2. **Dispatch per shape** — `agents/dispatch-shapes.md`: sequential
   worker→reviewer, or the parallel wave shape when the human confirmed
   parallel. Role prompts stay `@role:worker` / `@role:reviewer` (the
   extension substitutes the bodies).
3. **Gate the verdict** per `agents/execution-doctrine.md`: run
   `gateCommands` in order; `ok:true` → persist the round to
   `.workflows/reviews/<task-id>.md`, mark ✅ in plan.md with
   cost/duration; `ok:false` → bounded fix rounds.
4. **Budget check, then re-call `dispatch_next`.** Before every re-run,
   check spend (`.workflows/journal.jsonl`) against
   `.workflows/budget.json` — exhausted ⇒ **BUDGET STOP** (a stop, not
   a failure): print done vs remaining; wait for the human to raise it.
5. **Stop** when `dispatch_next` returns `no-pending` / `no-tasks`
   (plan complete) or raises an exception; print the completion
   summary: plan goal, totals (✅/❌/⏭️), duration, cost.

## Exceptions — the same three as /next

- **BLOCKED** (`ok: false`): surface `reason` and STOP — `no-pending` /
  `no-tasks` (done); `deps-unsatisfied`; `stale-status` (✅ without its
  `ok:true` verdict on file); `missing-spec`; `no-policy` (add the
  registry entry per `agents/registry.md`).
- **NEEDS_CONTEXT**: `dispatch_next` cannot run or its inputs are
  unreadable — ask the human; never invent plan data.
- **Parallelism confirmation**: `eligible` > 1 — ask "all in parallel
  or one at a time?" Parallel requires disjoint Allowed Changes
  (`agents/registry.md`); `[PARALLEL-GROUP]` waves are planner-approved
  — still verify disjointness.

$@
