---
name: plan
description: Decompose work into atomic tasks with contracts. Use when the user wants to plan, break down work, create a task list, or go from idea to execution.
user-invocable: true
argument-hint: "<what to plan, or path to exploration output>"
---

# Plan Workflow

Decompose work into atomic tasks with verifiable contracts. Each worker task gets a `.spec` file upfront that defines Intent, Decisions, Boundaries, and Completion Criteria.

## Phase 1: UNDERSTAND

Gather enough context to plan well.

1. **What's the goal?** Read what the human described. If vague, ask 1-2 clarifying questions max.
2. **What exists already?**
   - Read domain memory if present: `CONTEXT.md`, `CONTEXT-MAP.md`, relevant `docs/adr/*.md`
   - If the human pointed at a repo: scout it (`/scout` or read exploration output)
   - If the human pointed at URLs: read them with `bash` (`curl -sL <url> | head -500`)
   - If there's an existing exploration doc: read it
   - If there's an existing codebase: grep/find the relevant areas
3. **What are the constraints?** Stack, dependencies, timeline, risk tolerance.

### Structured Interview (if pi-interview is available)

After analyzing the codebase, domain memory, ADRs, and understanding the goal, generate an interview for the human. Ask only decisions that remain unresolved after evidence gathering. Create a questions JSON file and call `interview()`.

Include questions for:
- Framework / library choices (single-select, with `recommended` from your analysis)
- Feature scope (multi-select, pre-select essential ones)
- Testing strategy preference (single-select, map from bottleneck analysis)
- Model / thinking preferences for critical tasks
- Constraints (deadline, budget, compatibility)
- Open questions (text input for anything structured options miss)

Use `weight: "critical"` for decisions that affect architecture.
Use `weight: "minor"` for style preferences.
Use `conviction: "strong"` when the codebase analysis gives a clear answer.
Use `conviction: "slight"` when multiple options are reasonable.

If pi-interview is not installed, fall back to asking questions in chat.

### Interview → Spec Map Mapping

Use interview responses to pre-fill the Spec Map:
- Framework choice → determines worker toolchain assumptions
- Feature scope → determines task list and dependencies
- Testing preference → fills Testing Strategy column
- Constraint answers → may promote tasks to 🔴 BLOCKING or 🟡 RISKY

🛑 **GATE**: Do you understand the goal well enough to plan? If not, explore more first.

## Phase 2: DECOMPOSE

Break the goal into atomic tasks. Each task that involves code changes gets a contract.

### What makes a task atomic:
- **One agent can do it** — no coordination needed mid-task
- **Input is unambiguous** — exact files, exact behavior, exact acceptance criteria
- **Output is verifiable** — test passes, contract satisfied, lint clean, build succeeds
- **Failure is isolated** — doesn't block unrelated tasks
- **15-45 minutes of work** — if bigger, split further

### Task types:
- **scout** — read-only reconnaissance, no code changes, no contract needed
- **worker** — builds/fixes/refactors code, REQUIRES a contract
- **reviewer** — mechanical verification (agent-spec lifecycle + tdd-guard + project checks), no contract needed
- **quality-reviewer** — judgment-based code review, runs AFTER mechanical verification passes
- **human** — decision point, no contract needed

### Decomposition rules:
1. **Scout before build** — always understand before changing
2. **One concern per task** — don't bundle "add cache module" + "add cache to handler"
3. **Independent tasks can be parallel** — mark them: `[PARALLEL-GROUP: A]`, `[PARALLEL-GROUP: B]`, etc. Tasks in the same group run concurrently via pi-subagents. Groups execute as waves: all tasks in group A must finish before group B starts.
4. **Sequential dependencies are explicit** — TASK 5 depends on TASK 4
5. **Human tasks are real** — if you need a decision, make it a human task, don't guess
6. **Include a final verification task** — reviewer runs agent-spec guard + full suite

### Task ordering:
```
SCOUT tasks first (understand the codebase)
  ↓
PLAN review (human approves)
  ↓
BUILD tasks (ordered by dependency, parallel where independent)
  ↓  each has a .spec contract
VERIFY task (reviewer runs agent-spec guard + tdd-guard + full suite)
  ↓
QUALITY REVIEW task (quality-reviewer runs judgment review)
  ↓
DOCS task (optional — generate/update docs)
  ↓
SHIP task (human approves)
```

### Docs task (optional):
For significant features, include a docs task:
- **Agent**: worker (cheap model via `/docs` command)
- **What**: Generate/update `docs/architecture.md` with what changed
- **Why**: ensures architecture docs stay current after significant changes
- **Note**: This can be skipped if changes are minor

### Bottleneck Tags

Tag every task with a bottleneck indicator:

| Tag | When | Implication |
|---|---|---|
| 🔴 BLOCKING | Others depend on this. Must succeed first. | Use strongest model, human review after |
| 🟡 RISKY | Approach uncertain. Might fail. | Consider prototype first, then build |
| 🔵 TIME_CONSUMING | Large scope but straightforward. | Break into smaller steps |
| 🟠 VERIFICATION_HEAVY | Needs extensive testing (UI, security, edge cases). | Budget extra verification time |
| ⚪ STANDARD | Normal task. Default. | Default flow |

### Testing Strategy Assignment

Assign a testing strategy per task based on code type:

| Code type | Strategy | When to use |
|---|---|---|
| API endpoint / CLI command | example-based (agent-spec BDD) | Most tasks |
| Domain logic (math, parsing, transformation) | property-based (fast-check, proptest) | Pure functions |
| External input handler | fuzz + example-based | Parsing user data |
| Web UI | example-based + pi-annotate (quick) / bombadil (full) | Browser tasks |
| State machine | stateful property tests | Complex state transitions |
| Simple CRUD | example-based only | Boilerplate tasks |

### Domain Memory Rules

- Use glossary terms from `CONTEXT.md` in task titles, specs, and test names.
- If user language conflicts with `CONTEXT.md`, call it out before planning.
- If requested design contradicts an ADR, flag the conflict and ask before proceeding.
- If a durable domain term is clarified, update `CONTEXT.md` or note that it should be created from `templates/CONTEXT.md`.
- Offer an ADR only when a decision is hard to reverse, surprising without context, and based on a real tradeoff.

## Phase 3: WRITE CONTRACTS

For **every worker task**, generate a `.spec` file in `specs/`:

```bash
mkdir -p specs
```

All contracts are written upfront so the human can review them before execution starts. `/next` will re-validate contracts against learnings from completed tasks and update if needed.

### Contract template:

```spec
spec: task
name: "<task title>"
tags: [<relevant tags>]
---

## Intent

<What to build and why — 1-3 sentences>

## Decisions

- <Technical choice already fixed>
- <Another fixed decision>

## Boundaries

### Allowed Changes
- <exact file paths or globs>

### Forbidden
- <files or areas that must not change>
- <do not modify existing behavior in X>

## Completion Criteria

Scenario: <descriptive name>
  Test: <exact test function name the worker must write>
  Given <precondition>
  When <action>
  Then <expected outcome>
  And <additional assertion>

Scenario: <edge case name>
  Test: <test function name>
  Given <precondition>
  When <action>
  Then <expected outcome>
```

### Contract writing rules:
- Every BDD scenario MUST have an explicit `Test:` selector — the exact function name
- Boundaries MUST list specific file paths, not vague descriptions
- Decisions are fixed — the worker may not re-open them
- Completion Criteria define "done" — if all scenarios pass, the task is done
- Include edge cases: error states, boundary values, empty inputs
- Include at least one negative scenario (what should fail)

### Example contract:

```spec
spec: task
name: "Redis cache module"
tags: [cache, redis, api]
---

## Intent

Add a Redis-backed cache layer for API responses with TTL support.

## Decisions

- Use `redis` crate (already in Cargo.toml)
- Cache key format: `<service>:<resource>:<id>`
- Default TTL: 300 seconds

## Boundaries

### Allowed Changes
- src/cache/**
- src/cache.rs
- tests/cache/**

### Forbidden
- Do not modify existing API handlers
- Do not change the Redis connection pool configuration
- Do not alter response serialization

## Completion Criteria

Scenario: Set and get cached value
  Test: test_cache_set_then_get_returns_value
  Given Redis is connected
  When I set key "api:user:123" to value "{\"name\":\"Alice\"}" with TTL 300
  Then get("api:user:123") returns "{\"name\":\"Alice\"}"

Scenario: Cache miss returns None
  Test: test_cache_get_nonexistent_key_returns_none
  Given Redis is connected
  When I get key "api:user:999" that does not exist
  Then the result is None

Scenario: Expired key returns None
  Test: test_cache_expired_key_returns_none
  Given key "api:user:456" was set with TTL 1 second
  When 2 seconds have passed
  Then get("api:user:456") returns None

Scenario: Delete removes cached key
  Test: test_cache_delete_removes_key
  Given key "api:user:789" exists in cache
  When I delete "api:user:789"
  Then get("api:user:789") returns None
```

## Phase 4: WRITE PLAN

Write the plan to `plan.md` in the project root. Reference contract files.

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

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | scout | Survey auth module | ⚪ STANDARD | — | 0 | — |
| TASK_2 | worker | Add login API | 🔴 BLOCKING | example-based | 1 | TASK_1 |
| TASK_3 | worker | Add OAuth flow | 🟡 RISKY | example-based | 1 | TASK_1 |
| TASK_4 | worker | Rate limiter | 🟠 VERIFICATION_HEAVY | property-based | 2 | TASK_2 |
| TASK_5 | reviewer | Verify auth system | ⚪ STANDARD | — | 3 | TASK_2-4 |
| TASK_6 | quality-reviewer | Quality review | ⚪ STANDARD | — | 3 | TASK_5 |

## Tasks

### TASK 1: Scout <area>
- **Agent**: scout
- **Depends on**: none
- **Bottleneck**: ⚪ STANDARD
- **What**: <specific>
- **Verify**: context.md exists with findings
- **Status**: ⬜ PENDING / ✅ DONE / ❌ FAILED

### TASK 2: Build <thing>
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: specs/task-<name>.spec
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **What**: <specific>
- **Verify**: agent-spec lifecycle specs/task-<name>.spec
- **Status**: ⬜ PENDING

### TASK N: Verify all
- **Agent**: reviewer
- **Depends on**: all build tasks
- **What**: Run 3-layer verification (agent-spec + tdd-guard + project checks)
- **Verify**: all contracts pass, all tests green
- **Status**: ⬜ PENDING

### TASK N+1: Quality review
- **Agent**: quality-reviewer
- **Depends on**: verify task
- **What**: Judgment-based code review (simplicity, security, error handling)
- **Status**: ⬜ PENDING

## Contracts
| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 2 | specs/task-<name>.spec | 4 scenarios |
| TASK 3 | specs/task-<other>.spec | 3 scenarios |

## Execution Notes
<filled in as tasks are completed — includes cost, duration, and learnings per task>
```

🛑 **GATE**: Present the plan to the human. Do NOT proceed without approval.

## Phase 5: REVIEW WITH HUMAN

Present a compact summary:

```
## Plan: <goal>
## <N> tasks, <M> contracts, <P> parallel groups, estimated <X> sequential steps

<task list — one line each, with bottleneck tags>

### Bottleneck summary:
- 🔴 BLOCKING: <count> tasks (critical path)
- 🟡 RISKY: <count> tasks (may need prototype)
- 🟠 VERIFICATION_HEAVY: <count> tasks (extra test budget)
- ⚪ STANDARD: <count> tasks

### Contracts generated:
- specs/task-<name>.spec — 4 scenarios (set/get, miss, expiry, delete)
- specs/task-<other>.spec — 3 scenarios

### Parallel opportunities:
- TASK 2 + TASK 3 can run concurrently (independent modules)

### Risky tasks:
- TASK 5: <why risky>

### Decisions needed:
- <anything you're unsure about>
```

Ask the human:
- Tasks right granularity?
- Bottleneck tags accurate?
- Testing strategies appropriate?
- Contracts capture the right scenarios?
- Any missing?
- Approve to start execution?

### Wave execution summary:
```
Wave 0: TASK 1 (scout)
Wave 1: TASK 2 + TASK 3 (parallel, PARALLEL-GROUP: A)
Wave 2: TASK 4 (depends on wave 1)
Wave 3: TASK 5 + TASK 6 (verification)
```
All tasks in a wave must complete before the next wave starts. `/next` enforces this.

## Phase 6: HAND OFF

Once approved, tell the human:

```
Plan approved. Execute with:
  /next    → run the next pending task
  /task 3  → run a specific task
  /status  → show plan progress + cost summary
  /verify  → run 3-layer verification on all contracts
  /review  → mechanical + quality review

Or run tasks manually:
  /scout   → TASK 1
  /add     → TASK 2, 3, ... (implements against contract)
  /fix     → fix a bug within contract boundaries
```

## Rules

- **Plans are living documents** — update `plan.md` as you learn. Mark tasks done. Add notes.
- **Plans change** — if TASK 3 reveals that TASK 4 needs different scope, update the plan AND its contract. Don't silently deviate.
- **Every worker task has a contract** — if you can't write a contract, the task isn't atomic enough.
- **Contracts are validated before execution** — `/next` checks if the spec is still valid given completed work, and updates it if needed.
- **Scout first, always** — even if the human says "just build it." One scout task saves three rework tasks.
- **Contracts are reviewed, not code** — the human approves the contract. The machine verifies the implementation.
- **Keep the human in the loop** — present after planning, not after building.
- **Bottleneck tags guide execution** — they tell /next which model/thinking to use.
- **Testing strategy is pre-assigned** — the worker follows the strategy, doesn't guess.
- **Parallel groups execute as waves** — all tasks in a wave must finish before the next wave starts. `/next` enforces this. Within a wave, tasks run via pi-subagents with `worktree: true`.
