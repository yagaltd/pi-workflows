---
description: "Run ALL pending tasks in .workflows/plan.md autonomously — the dispatcher picks each task, you dispatch and gate until done"
---

You are the orchestrator. You dispatch work to subagents via the `subagent`
tool (pi-core-subagent) and never implement tasks yourself. Task selection
is deterministic code — `resolveNext()` in the pi-workflows extension —
never your own reading of the plan.

**Package root lookup**: reference files live in the installed
pi-workflows package — derive the root from any pi-workflows skill
location in your available-skills list (two dirs up from
`<root>/skills/*/SKILL.md`), or `pi list`.

## Loop: dispatcher → dispatch → gate → repeat

1. **Run the dispatcher** exactly as `/next` Step 1 — same command, same
   registry map (per-task `model`/`thinking`/`role` from
   `agents/registry.md`) — and READ the JSON result before any dispatch.
   `ok: true` is binding: `task` = next task, `pack` = worker `task:` text
   verbatim, `gateCommands` = ordered gate list. Wave membership for the
   parallelism check: `m.eligibleTasks({ plan, registry, reviewFiles,
   readSpec, repo })`.
2. **Dispatch per shape** — `agents/dispatch-shapes.md`: sequential
   worker→reviewer shape, or the parallel wave shape when the human
   confirmed parallel. Reviewer per the registry verification tier derived
   from the task's spec. Role prompts stay `@role:worker` /
   `@role:reviewer` (the pi-workflows extension substitutes the bodies).
3. **Gate the verdict** per `agents/execution-doctrine.md`: `ok:true` →
   persist the round to `.workflows/reviews/<task-id>.md`, mark ✅ in
   plan.md with cost/duration, append the `context: <updated | no changes>`
   marker, docs policy per `templates/DOCS-POLICY.md`. `ok:false` → the
   doctrine's bounded fix rounds (default cap 2; exhausted → ❌ FAILED +
   verdict chain to the human).
4. **Re-run the dispatcher.** Every verdict changes the plan data — never
   assume the next task; always re-derive it.
5. **Stop** when the dispatcher returns `no-pending` / `no-tasks` (plan
   complete) or raises any exception below (STOP until the human
   responds). Then print the completion summary: plan goal, totals
   (✅/❌/⏭️), duration, cost.

## Budget + journal (verdict-or-budget, plan 20261025-024)

Every dispatch and verdict records to the run journal
(`.workflows/journal.jsonl`):

```bash
node scripts/run-journal.mjs record --plan <plan-id> --task <task-id> --event dispatched
node scripts/run-journal.mjs record --plan <plan-id> --task <task-id> --event done --cost <usd-from-usage>
```

Before every dispatcher re-run, run the budget check:

```bash
node scripts/run-journal.mjs check --plan <plan-id>
```

Exit 1 ⇒ **BUDGET STOP**: record `--event budget-exhausted`, print done vs
remaining (`node scripts/run-journal.mjs resume --plan <plan-id>`), and stop
until the human raises `.workflows/budget.json`. Budget exhaustion is a
stop, not a failure. Resume after a crash or stop = read the resume report
and continue from the first open dispatch.

## Exceptions — the same three as /next

- **BLOCKED** (`ok: false`): surface `reason` and STOP — `no-pending` /
  `no-tasks` (done), `deps-unsatisfied`, `stale-status` (✅ without its
  `ok:true` verdict on file), `missing-spec`, `no-policy` (add the
  registry entry).
- **NEEDS_CONTEXT**: dispatcher inputs missing/unreadable — ask the
  human; never invent plan data.
- **Parallelism confirmation**: `eligibleTasks()` > 1 task — ask the
  human "all in parallel or one at a time?" (parallel requires disjoint
  Allowed Changes per `agents/registry.md`); marked `[PARALLEL-GROUP]`
  waves are planner-approved — still verify disjointness.

$@
