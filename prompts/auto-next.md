---
description: "Run ALL pending tasks in .workflows/plan.md autonomously — waves, parallel, blocker handling"
---

You are the orchestrator. You dispatch work to subagents via the `subagent`
tool (pi-core-subagent) and never implement tasks yourself.

Read first (both normative): `agents/registry.md` (dispatch policy) and
`agents/execution-doctrine.md` (verdict gating + fix rounds — Step 4
assumes it). Shapes for wave/scout calls: `agents/dispatch-shapes.md`.

## Auto-Next: Run Entire Plan

Execute ALL pending tasks in `.workflows/plan.md` autonomously, wave by
wave, until the plan is complete or a blocker stops you.

### Step 1: Load the plan

All `⬜ PENDING` tasks, wave groupings, dependencies, bottleneck tags.

### Step 2: Build the execution graph

- Each worker task gets `id: "task-<n>"`; cross-task dependencies become
  `needs` edges; the wave's reviewer node `needs` all wave workers.
- Role prompts use `@role:<name>` (extension resolves; else paste
  `agents/<role>.md` verbatim).
- Worker task text: goal + "First read: contract, plan.md Execution Notes,
  CONTEXT.md" + `Verify:` line (the workflow lives in the role prompt —
  do not restate it).
- Reviewer task texts must end: "End with one Verdict block per task:
  `ok: true|false` + findings with evidence."
- Parallel tasks MUST have disjoint `Allowed Changes` — overlapping →
  `needs` edge instead. Hard limits: ≤16 tasks/call (split at wave
  boundaries), concurrency ≤8.

### Step 3: Run it

```text
subagent({
  background: true,           // stay responsive while the wave runs
  notifyPerTask: true,        // wake as each task completes
  allowIntercom: true,        // workers can ask_parent mid-task
  concurrency: 4,
  tasks: [
    { id: "task-2", agent: "worker-task-2", prompt: "@role:worker",
      write: true, thinking: "<per tag>", task: "Implement TASK 2 ... <per Step 2>" },
    { id: "task-3", ... },
    { id: "verify-w1", agent: "reviewer", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"], thinking: "high",
      needs: ["task-2", "task-3"], task: "<per dispatch-shapes.md>" },
  ],
})
```

Park on the run: `await_subagent({ runId, timeoutMs: 20000 })` in a loop;
`reply_subagent` for children's questions; `steer_subagent` to redirect
(scope creep, wrong file). A failed task auto-aborts its dependents —
handle the failed root cause, don't retry the aborted branch.

### Step 4: Per task (verdict gating — execution-doctrine.md)

✅ only on reviewer `ok:true`. Every `ok:false` → bounded fix round
(fix-<task>-<N> with rejection evidence verbatim → re-review → repeat
while N < max-rounds, default 2; exhausted → ❌ FAILED + verdict chain).

Per settled task:
1. Append the verdict round to `.workflows/reviews/<task-id>.md`
2. **Ground truth**: `git diff --stat` vs Allowed Changes
3. plan.md: ✅/❌ + cost/duration (subagent usage) + learnings in Execution Notes
4. **CONTEXT.md + marker**: worker's `## Domain Memory` → append non-empty
   Terms/Decisions (ADR if 3-criteria); ALWAYS append
   `context: <updated | no changes>` to the task's Execution Notes
5. Downstream specs: update next 1-2 contracts from learnings — already
   queued in a running graph → `steer_subagent` the child instead

### Step 5: Blockers stop the wave

WORKER_BLOCKER needing the human (`missing_dependency`, `missing_secret`,
`unclear_requirement`, `unsafe_request`): `subagent_cancel({ runId })`,
mark ❌, present blocker + plan-so-far + action needed, and STOP until the
human responds. (`invalid_contract` does NOT stop the run: fix the
contract, task back to ⬜, re-dispatch next wave.)

### Step 6: Completion

```
### Auto-Next Complete
Plan: <goal> · Total: <N> · ✅ <N> · ❌ <N> · ⏭️ <N>
Duration: <t> · Cost: <sum of subagent usage>
Ready for /review.
```

$@
