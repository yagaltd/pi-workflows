---
description: "Run ALL pending tasks in .workflows/plan.md autonomously — waves, parallel, blocker handling"
---

You are the orchestrator. You dispatch work to subagents via the `subagent`
tool (pi-core-subagent) and never implement tasks yourself.

First, read the dispatch policy: `agents/registry.md` in the pi-workflows
package (role prompts + model/thinking per bottleneck tag + isolation rules).

## Auto-Next: Run Entire Plan

You will execute ALL pending tasks in `.workflows/plan.md` autonomously, wave by wave, until the plan is complete or a blocker stops you.

### Step 1: Load the Plan

Read `.workflows/plan.md` and identify:
- All `⬜ PENDING` tasks
- Their wave groupings (`[PARALLEL-GROUP: X]`)
- Dependencies between tasks
- Bottleneck tags (🔴 BLOCKING, 🟡 RISKY, etc.)

### Step 2: Build the execution graph

Translate the plan into pi-core-subagent `needs` edges:

- Each worker task gets an `id` (`task-<n>`) derived from its TASK number
- Cross-wave dependencies become `needs` edges: if TASK 5 depends on TASK 4,
  `task-5` gets `needs: ["task-4"]`
- Reviewer tasks `needs` all build tasks in their wave; quality-reviewer
  `needs` the reviewer. Their prompts come verbatim from
  `agents/reviewer.md` / `agents/quality-reviewer.md`
- **Parallel tasks must have disjoint `Allowed Changes`** (children share one
  filesystem — registry isolation policy). Overlapping boundaries → add a
  `needs` edge instead of parallelizing
- Hard limits: ≤16 tasks per call (split into multiple calls at wave
  boundaries), concurrency ≤8

Dispatch each task with the full worker workflow from `/next` (prompt body
from `agents/worker.md`, `write: true`, `thinking` from the bottleneck tag,
task text naming the contract file to read first + the TDD BUILD + VERIFY
workflow + a runnable `Verify:` line).

### Step 3: Run it

For each wave (or the whole graph if it fits one call):

```text
subagent({
  background: true,           // you stay responsive while the wave runs
  notifyPerTask: true,        // wake as each task completes
  allowIntercom: true,        // workers can ask_parent instead of dead-ending
  concurrency: 4,
  tasks: [
    { id: "task-2", agent: "worker-task-2", prompt: "<agents/worker.md body>",
      write: true, thinking: "<per tag>",
      task: "Implement TASK 2 ... (full /next worker task text)" },
    { id: "task-3", ... },
    { id: "verify-w1", agent: "reviewer", prompt: "<agents/reviewer.md body>",
      tools: ["read","grep","find","ls","bash"], thinking: "high",
      needs: ["task-2", "task-3"], task: "..." },
  ],
})
```

Then park on the run:

- `await_subagent({ runId, timeoutMs: 20000 })` in a loop — each wake
  delivers completed-task results and any `ask_parent` questions inline
- Answer children with `reply_subagent` as they ask
- `steer_subagent` to redirect a child mid-run (scope creep, wrong file, ...)
- A failed task **auto-aborts its dependents** — when you see aborted
  downstream tasks, don't retry them; handle the failed root cause first

### Step 4: After Each Task Completes

1. **Ground truth**: `git diff --stat` — reconcile what changed against the
   contract's Allowed Changes before trusting the child's report
2. **Update plan.md**: mark task status as ✅ DONE or ❌ FAILED
3. **Add learnings**: cost, duration, and any discoveries to Execution Notes
4. **Update `.workflows/CONTEXT.md`**: add any domain decisions discovered
5. **Check downstream specs**: update the next 1-2 pending contracts based on learnings — if an edge is already queued in a running graph, steer the affected child instead

### Step 5: Blockers Stop the Wave

If a task fails or hits a WORKER_BLOCKER that needs the human
(`missing_dependency`, `missing_secret`, `unclear_requirement`,
`unsafe_request`):

1. `subagent_cancel({ runId })` — abort the run (dependents auto-abort)
2. Mark it `❌ FAILED` in plan.md
3. Present to the human:

```
### Auto-Next Blocked

Task <N> (<goal>) is blocked:
- Reason: <blocker reason>
- Evidence: <details>

Plan so far:
- Completed: <N> tasks
- Failed: <N> tasks
- Remaining: <N> tasks

Action needed: <what human should do>
```

Do NOT continue until the human responds. After they resolve, resume from the failed task's wave.

`invalid_contract` blockers do NOT stop the run: fix the contract, mark the
task back to ⬜ PENDING, and re-dispatch it in the next wave call.

### Step 6: Completion

When all waves are complete, present:

```
### Auto-Next Complete

Plan: <goal>
Total tasks: <N>
- ✅ Completed: <N>
- ❌ Failed: <N>
- ⏭️ Skipped: <N>

Duration: <total time>
Cost: <sum of per-task usage from subagent results>

Ready for /review to run full verification.
```

$@
