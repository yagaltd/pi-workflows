---
description: "Run ALL pending tasks in .workflows/plan.md autonomously — waves, parallel, blocker handling"
model: deepseek/deepseek-v4-flash
thinking: xhigh
restore: true
---

## Auto-Next: Run Entire Plan

You will execute ALL pending tasks in `.workflows/plan.md` autonomously, wave by wave, until the plan is complete or a blocker stops you.

### Step 1: Create Parent Goal

```javascript
create_goal({
  objective: "Complete all tasks in .workflows/plan.md: run every wave sequentially, parallelize within waves, handle blockers, mark completion.",
  token_budget: 100000
})
```

### Step 2: Load the Plan

Read `.workflows/plan.md` and identify:
- All `⬜ PENDING` tasks
- Their wave groupings (`[PARALLEL-GROUP: X]`)
- Dependencies between tasks
- Bottleneck tags (🔴 BLOCKING, 🟡 RISKY, etc.)

### Step 3: Execute Wave by Wave

For each wave (starting from the earliest incomplete wave):

#### Single-task waves (scout, reviewer, quality-reviewer, or standalone worker)

Delegate to a subagent using the exact same task template from `/next`:

```javascript
subagent({
  agent: "<agent>",
  task: `Implement TASK <N>: <goal>.

Read the contract at .workflows/specs/<task-id>.spec.

## Workflow

### BUILD (TDD vertical slices)
1. Read the contract: Intent, Decisions, Boundaries, Completion Criteria
2. For EACH scenario in Completion Criteria:
   a. Write ONE test for that scenario → it fails (RED)
   b. Write minimal code to pass it (GREEN)
   c. Refactor if needed
3. Run all tests → they all pass
4. Run full verification

### VERIFY (run in order, stop at first failure)
1. agent-spec lifecycle .workflows/specs/<task-id>.spec --code . --format json
2. agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
3. Project checks: tests, lint, typecheck, build

### Rules
- Simplicity first, surgical changes, fail-fast
- If blocked, output WORKER_BLOCKER
`,
  reads: [".workflows/plan.md", ".workflows/specs/<task-id>.spec"],
  progress: true
})
```

#### Multi-task waves (parallel group)

Run ALL tasks in the current wave concurrently:

```javascript
subagent({
  tasks: [
    {
      agent: "worker",
      task: `Implement TASK <N>: <goal>.\n\nRead contract at .workflows/specs/<task-id>.spec.\n\nTDD: RED→GREEN per scenario. Verify: agent-spec lifecycle + guard + project checks.\nIf blocked, output WORKER_BLOCKER.`,
      reads: [".workflows/plan.md", ".workflows/specs/<task-id>.spec"]
    },
    // ... one entry per task in the wave
  ],
  concurrency: 4,
  worktree: true
})
```

Wait for ALL tasks in the wave to complete before advancing.

### Step 4: After Each Task Completes

1. **Update plan.md**: mark task status as ✅ DONE or ❌ FAILED
2. **Add learnings**: cost, duration, and any discoveries to Execution Notes
3. **Update `.workflows/CONTEXT.md`**: add any domain decisions discovered
4. **Check downstream specs**: update next 1-2 pending contracts based on learnings
5. **Handle blockers**: if WORKER_BLOCKER found:
   - **invalid_contract**: fix the contract and retry
   - **missing_dependency / missing_secret**: STOP — ask human to provide
   - **unclear_requirement**: STOP — ask human for clarification
   - **unsafe_request**: STOP — report to human

### Step 5: Blockers Stop the Wave

If a task hits a STOP blocker:
1. Mark it `❌ FAILED` in plan.md
2. Present to the human:

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

Do NOT continue until the human responds. After they resolve, resume from the current wave.

### Step 6: Completion

When all waves are complete:

```javascript
update_goal({ status: "complete" })
```

Present:

```
### Auto-Next Complete

Plan: <goal>
Total tasks: <N>
- ✅ Completed: <N>
- ❌ Failed: <N>
- ⏭️ Skipped: <N>

Duration: <total time>
Cost: <total estimated cost>

Ready for /review to run full verification.
```

$@
