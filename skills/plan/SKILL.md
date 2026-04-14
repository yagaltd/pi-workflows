---
name: plan
description: Decompose work into atomic tasks with dependencies, agents, and verification. Use when the user wants to plan, break down work, create a task list, or go from idea to execution.
user-invocable: true
argument-hint: "<what to plan, or path to exploration output>"
---

# Plan Workflow

Decompose work into atomic tasks. Each task is independently executable and verifiable.

## Phase 1: UNDERSTAND

Gather enough context to plan well.

1. **What's the goal?** Read what the human described. If vague, ask 1-2 clarifying questions max.
2. **What exists already?**
   - If the human pointed at a repo: scout it (`/scout` or read exploration output)
   - If the human pointed at URLs: read them with `bash` (`curl -sL <url> | head -500`)
   - If there's an existing exploration doc: read it
   - If there's an existing codebase: grep/find the relevant areas
3. **What are the constraints?** Stack, dependencies, timeline, risk tolerance.

🛑 **GATE**: Do you understand the goal well enough to plan? If not, explore more first.

## Phase 2: DECOMPOSE

Break the goal into atomic tasks.

### What makes a task atomic:
- **One agent can do it** — no coordination needed mid-task
- **Input is unambiguous** — exact files, exact behavior, exact acceptance criteria
- **Output is verifiable** — test passes, metric improves, lint clean, build succeeds
- **Failure is isolated** — doesn't block unrelated tasks
- **15-45 minutes of work** — if bigger, split further

### Task format:
For each task, write:

```
### TASK N: <verb> <what> <where>

**Agent**: scout | worker | reviewer | human
**Depends on**: TASK M (or: none)
**Files in scope**: exact paths
**What to do**: <specific instructions — not vague>
**Verify with**: <exact command or test>
**Done when**: <exact condition>
```

### Decomposition rules:
1. **Scout before build** — always understand before changing
2. **One concern per task** — don't bundle "add cache module" + "add cache to handler" in one task
3. **Independent tasks can be parallel** — mark them: `[PARALLEL-GROUP: A]`
4. **Sequential dependencies are explicit** — TASK 5 depends on TASK 4
5. **Human tasks are real** — if you need a decision, make it a human task, don't guess
6. **Include a final verification task** — reviewer runs full suite after all build tasks

### Task ordering:
```
SCOUT tasks first (understand the codebase)
  ↓
PLAN review (human approves)
  ↓
BUILD tasks (ordered by dependency, parallel where independent)
  ↓
VERIFY task (reviewer runs full suite)
  ↓
SHIP task (human approves)
```

## Phase 3: WRITE PLAN

Write the plan to `plan.md` in the project root.

```markdown
# Plan: <goal>

> Created: <date>
> Status: DRAFT / APPROVED / IN PROGRESS / COMPLETE

## Context
- <what we're building and why>
- <key constraints>
- <key decisions made>

## Exploration
<summary of what was found, or "see exploration output above">

## Tasks

### TASK 1: Scout <area>
- **Agent**: scout
- **Depends on**: none
- **What**: <specific>
- **Verify**: <how>
- **Status**: ⬜ PENDING / ✅ DONE / ❌ FAILED / 🔄 IN PROGRESS

### TASK 2: Build <thing>
- **Agent**: worker
- **Depends on**: TASK 1
- **What**: <specific>
- **Verify**: <how>
- **Status**: ⬜ PENDING

### TASK 3: Build <other thing>
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel with**: TASK 2
- **What**: <specific>
- **Verify**: <how>
- **Status**: ⬜ PENDING

### TASK N: Verify all
- **Agent**: reviewer
- **Depends on**: all build tasks
- **What**: Run full test suite, lint, types, build
- **Verify**: everything green
- **Status**: ⬜ PENDING

## Execution Notes
<filled in as tasks are completed — what worked, what didn't, what changed>
```

🛑 **GATE**: Present the plan to the human. Do NOT proceed without approval.

## Phase 4: REVIEW WITH HUMAN

Present a compact summary:

```
## Plan: <goal>
## <N> tasks, <M> parallel groups, estimated <X> sequential steps

<task list — one line each>

### Parallel opportunities:
- TASK 2 + TASK 3 can run concurrently (independent modules)

### Risky tasks:
- TASK 5: <why risky>

### Decisions needed:
- <anything you're unsure about>
```

Ask the human:
- Tasks right granularity?
- Any missing?
- Parallel grouping correct?
- Approve to start execution?

## Phase 5: HAND OFF

Once approved, tell the human:

```
Plan approved. Execute with:
  /next    → run the next pending task
  /task 3  → run a specific task
  /status  → show plan progress

Or run tasks manually:
  /scout   → TASK 1
  /add     → TASK 2, 3, ...
  /review  → final verification
```

## Rules

- **Plans are living documents** — update `plan.md` as you learn. Mark tasks done. Add notes.
- **Plans change** — if TASK 3 reveals that TASK 4 needs different scope, update the plan. Don't silently deviate.
- **Every task is verifiable** — if you can't write a verification command, the task isn't atomic enough.
- **Scout first, always** — even if the human says "just build it." One scout task saves three rework tasks.
- **Keep the human in the loop** — present after planning, not after building.
