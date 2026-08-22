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
   - Read domain memory if present: `.workflows/CONTEXT.md`, `.workflows/CONTEXT-MAP.md`, relevant `.workflows/docs/adr/*.md`
   - If the human pointed at a repo: scout it (`/scout` or read exploration output)
   - If the human pointed at URLs: read them with `bash` (`curl -sL <url> | head -500`)
   - If there's an existing exploration doc: read it
   - If there's an existing codebase: grep/find the relevant areas
3. **What are the constraints?** Stack, dependencies, timeline, risk tolerance.

### Structured Interview (in chat)

After analyzing the codebase, domain memory, ADRs, and understanding the goal, interview the human in chat. Ask only decisions that remain unresolved after evidence gathering.

Ask about:
- Framework / library choices (offer options with a `recommended` from your analysis)
- Feature scope (which essentials are in/out)
- Testing strategy preference (map from bottleneck analysis)
- Model / thinking preferences for critical tasks (only when it changes cost materially)
- Constraints (deadline, budget, compatibility)
- Open questions (anything structured options miss)

Treat decisions that affect architecture as critical; style preferences as minor.
Have strong conviction when the codebase gives a clear answer; slight when multiple options are reasonable.

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
- **human** — decision point, no contract needed

Reviewer and quality-reviewer are **roles, not plan tasks**: `/next` dispatches
the reviewer automatically for every task (verdict gating + fix rounds), and
`/review` runs the final tier-2 gate (repo-wide guard, whole-diff adversarial
scan, quality judgment) at SHIP. Do NOT create plan-level "verify" or
"quality review" tasks — they duplicate the gate chain.

### Decomposition rules:
1. **Scout before build** — always understand before changing
2. **One concern per task** — don't bundle "add cache module" + "add cache to handler"
3. **Independent tasks can be parallel** — mark them: `[PARALLEL-GROUP: A]`, `[PARALLEL-GROUP: B]`, etc. Tasks in the same group run concurrently via pi-core-subagent (`tasks[]` in one subagent call). Groups execute as waves: all tasks in group A must finish before group B starts. **Tasks in the same parallel group MUST have disjoint `Allowed Changes` sets** — parallel subagents share one filesystem (no worktrees); overlapping boundaries → resequence with a dependency instead.
4. **Sequential dependencies are explicit** — TASK 5 depends on TASK 4
5. **Human tasks are real** — if you need a decision, make it a human task, don't guess
6. **Plans end at build tasks (+ optional docs task)** — final verification is `/review`'s job, not a plan task

### Task ordering:
```
SCOUT tasks first (understand the codebase)
  ↓
PLAN review (human approves)
  ↓
BUILD tasks (ordered by dependency, parallel where independent)
  ↓  each has a .spec contract + per-task reviewer verdict (fix rounds on reject)
DOCS task (optional — generate/update docs)
  ↓
/review (tier-2 gate: repo-wide guard, whole-diff adversarial scan,
  quality judgment, domain-memory sweep)
  ↓
SHIP (human approves: commit + archive)
```

### Docs task (optional):
For significant features, include a docs task:
- **Agent**: worker (cheap model via `/docs` command)
- **What**: Generate/update `.workflows/docs/architecture.md` with what changed
- **Why**: ensures architecture docs stay current after significant changes
- **Note**: This can be skipped if changes are minor

### Prototype tasks (for 🟡 RISKY / large Tier B tasks)

When a task's approach is unproven (the adversarial pass flagged it 🟡, or
the integration seam is unmapped), the plan decomposes it as
`prototype → impl` instead of one open-ended task:

- **The prototype is a first-class task type in plan.md** — `TASK <N>p (prototype)` —
  dispatched BEFORE the impl task it informs, with **its own spec** and the
  standard worker→reviewer loop. Same pipeline as every other task; no
  special verdict format, no separate VERDICT.md file.
- **Spec shape**: one bounded question ("does approach X hold for seam Y?"),
  Allowed Changes = `.workflows/spikes/<slug>/**` (poc code lives there,
  never in production paths), Forbidden = everything else. Completion
  Criteria are evidence criteria: artifact on disk, measurements, the
  concrete API/requirements discovered — not feature behavior.
- **Routing**: `@model:strong` + thinking high, serial, never in a parallel
  group (Tier C discipline — a prototype that lands in production files has
  violated its spec).
- **The draft plan is the living artifact**: the impl task it precedes stays
  in the plan draft with a placeholder spec deferred until the prototype's
  reviewer verdict lands. Then the orchestrator drafts the impl spec FROM
  the verdict's findings (same spec-drafter fan-out, evidence = verdict +
  spike artifacts) and re-presents the plan at the human approval gate —
  same process as usual; the gate confirms the plan with prototype evidence
  in hand. No separate confirmation artifact.
- **Why**: an open-ended "wire it together" task is the single most
  misfire-prone shape (class-5 evidence, plan-008: 5/7); a prototype task
  converts it into bounded-with-evidence — the impl task's spec cites
  measured facts instead of hoping the worker discovers them.

### Bottleneck Tags

Tag every task with a bottleneck indicator. Drive the tags from the Impact ×
Effort matrix (templates/THINKING-TOOLS.md §3 — package templates/, two dirs up from this skill): Quick Wins (high impact, low
effort) → ⚪ STANDARD; Big Bets (high, high) → 🟡 RISKY (prototype first) or
🔴 BLOCKING when on the critical path; verification-heavy Big Bets → 🟠.

| Tag | When | Implication |
|---|---|---|
| 🔴 BLOCKING | Others depend on this. Must succeed first. | Use strongest model, human review after |
| 🟡 RISKY | Approach uncertain. Might fail. | **Prototype task first** (see Prototype tasks), then build |
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
| Web UI | example-based + browser-automation subagent (quick) / bombadil property-based (if installed) | Browser tasks |
| State machine | stateful property tests | Complex state transitions |
| Simple CRUD | example-based only | Boilerplate tasks |

### Domain Memory Rules

- Use glossary terms from `.workflows/CONTEXT.md` in task titles, specs, and test names.
- If user language conflicts with `.workflows/CONTEXT.md`, call it out before planning.
- If requested design contradicts an ADR, flag the conflict and ask before proceeding.
- If a durable domain term is clarified, update `.workflows/CONTEXT.md` or note that it should be created from `templates/CONTEXT.md`.
- Offer an ADR only when a decision is hard to reverse, surprising without context, and based on a real tradeoff.

### Task Tiers

Every worker task is sized into one of three tiers; the tier decides routing (model/thinking), review depth, and parallelism.

| Tier | Size | Routing & review | Parallelism |
|---|---|---|---|
| **Tier A — mechanical** | ≤20 lines changed, single file, grep-able done | `@model:standard` + thinking low; review = grep-only tier OR the task's `Verify:` line (exit code + git diff — Graph Protocol §9: verification command, never self-report); or **orchestrator-inline** — don't dispatch at all when the subagent round-trip costs more than the edit | any group |
| **Tier B — bounded** | module + tests under contract, one concern | `@model:standard` (⚪/🔵/🟠) or `@model:strong` (🟡/🔴) per bottleneck tag; full mechanical review pipeline | any group |
| **Tier C — spike/architecture** | verdict artifact required | `@model:strong` + thinking high; serial, **never in a parallel group**; zero production files unless the verdict says GO | serial only |

- **Tier A explicitly includes the orchestrator-inline option** — when the subagent round-trip costs more than the edit, don't dispatch; do the edit yourself in the orchestrator.
- **Tiers are written next to tasks, not inferred** — every task carries its tier in plan.md (e.g. `TASK 3 (Tier B 🟡)`), and the tier is decided in the adversarial pass (phase 3 of the Drafting Pipeline), never by the worker.
- **Prototype tasks carry `(prototype)` instead of a tier** (e.g. `TASK 2p (prototype)`) — Tier C routing rules apply (strong model, thinking high, serial), plus their own spec and standard review loop (see Prototype tasks above).



## Phase 3: WRITE PLAN

Ensure the `.workflows/` directory exists:

```bash
mkdir -p .workflows
```

Write the plan to `.workflows/plan.md`. Contracts are listed by placeholder — they will be generated after approval in Phase 5.



```markdown
# Plan: <goal>

> Plan ID: <YYYYMMDD>-<NNN>
> Created: <date>
> Status: DRAFT / APPROVED / IN PROGRESS / DONE / SUPERSEDED

## Lifecycle
- Plan ID is assigned once at bootstrap: NNN = (entries in `.workflows/archive/done` + `.workflows/archive/superseded`) + 1, zero-padded to 3. Never reuse a Plan ID.
- `/idea` and `/plan` refuse to overwrite a live plan (DRAFT/APPROVED/IN PROGRESS) — route it to `/review` (ship → `archive/done/`) or `/abort` (abandon → `archive/superseded/`) first.
- SHIP (`/review`, all tasks ✅) → set Status: DONE and move the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/<PlanID>-<slug>/`.
- `/abort` → Status: SUPERSEDED, bundle to `.workflows/archive/superseded/<PlanID>-<slug>/` with reason.
- `.workflows/CONTEXT.md`, `docs/adr/`, `knowledge/`, `LOG.md` are never archived — durable knowledge outlives every plan.

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
| TASK_5 | worker | Docs: auth architecture | ⚪ STANDARD | — | 3 | TASK_2-4 |

## Tasks

### TASK 1: Scout <area>
- **Agent**: scout
- **Depends on**: none
- **Bottleneck**: ⚪ STANDARD
- **What**: <specific>
- **Verify**: .workflows/CONTEXT.md exists with findings
- **Status**: ⬜ PENDING / ✅ DONE / ❌ FAILED

### TASK 2: Build <thing>
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-<name>.spec
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **What**: <specific>
- **Verify**: agent-spec lifecycle .workflows/specs/task-<name>.spec
- **Status**: ⬜ PENDING

### TASK N: Docs (optional — significant changes only)
- **Agent**: worker (cheap dispatch per registry)
- **Depends on**: all build tasks
- **What**: Update `.workflows/docs/architecture.md` with what changed
- **Status**: ⬜ PENDING

(No verify/quality tasks: `/next` verdict-gates every task automatically;
`/review` is the final gate at SHIP.)

## Contracts (generated after approval)
| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 2 | .workflows/specs/task-<name>.spec | 4 scenarios |
| TASK 3 | .workflows/specs/task-<other>.spec | 3 scenarios |

## Execution Notes
<filled in as tasks are completed — includes cost, duration, and learnings per task>
```
🛑 **GATE**: Present the plan to the human. Do NOT proceed without approval.

## Drafting Pipeline

The plan is drafted in five phases on evidence, not memory; only the last phase is interactive.

1. **Scout** — facts-on-disk artifact `.workflows/scout/<plan-id>.md`: grep evidence, file paths with line anchors, API/vendor realities, existing-convention citations. Facts only — never summaries. (Reusable for every downstream phase; commit-adjacent, lives under `.workflows/` like specs.)
2. **Draft** — a subagent (`@model:strong`, thinking high) receives the scout facts + user goal + this SKILL.md format → writes the plan draft. **Grounding rule**: every Context claim must cite a scout fact (`file:line`) — uncited claims get flagged in phase 3.
3. **Adversarial + SPLIT/RISK pass** — orchestrator, challenge-skill discipline: walk every decision; single-surface inventory ("does this plan create a second path to X?"); per task: "can it be smaller? which tier? where's the integration seam?" — split or resequence accordingly. Rationale on record: dependency-partitioned graphs beat flat fan-out (+14% pass, −35% cost — pi-core-subagent "Why waves"); static ties dynamic when structure is known up front — which this pass produces. Adjust the draft directly; the draft is never dispatched unreviewed.
     **Value/impact matrix**: for every task ask "what is the cheapest path to the
     user-visible outcome?" — delete or inline tasks that only serve the design (Tier A
     orchestrator-inline exists precisely for this); a plan that survives this pass is
     minimal, not just decomposed.
4. **Spec drafting fan-out** — one spec-drafter subagent per decision (`@model:standard`, thinking high): inputs = decision verbatim + the scout-fact slices that concern it + boundaries + spec name. Orchestrator mechanically reviews each spec: every decision clause appears as a Completion Criterion; criteria grep-able or runnable; Allowed/Forbidden explicit and **disjoint across sibling specs** (shared-worktree rule: `git diff`-style criteria must be task-scoped). **Pre-dispatch git-dirty whitelist:** before any spec-drafter subagent dispatches, the orchestrator enumerates a deterministic shared-worktree **whitelist** so a dirty working tree is never a false blocker — sibling spec outputs are never violations by definition; the concrete enumerated whitelist is `M .workflows/LOG.md`, `M .workflows/plan.md`, `?? .workflows/specs/*.spec`. Only changes outside this whitelist count against the gate (e.g. stray edits to `src/` or other tasks' specs).
   **Prototype two-stage rule**: when the plan contains prototype tasks, only
   the prototype specs (and specs of prototype-independent tasks) are drafted
   now. Impls that consume a prototype's findings get their specs drafted
   AFTER that prototype's reviewer verdict — evidence = verdict + spike
   artifacts — followed by the human approval gate re-presenting the plan.
5. **Human approval gate** — unchanged: nothing dispatches before user approval. With prototype tasks, the gate fires twice: once to dispatch the prototypes, once (with prototype evidence attached) to confirm the impls.

## Phase 4: REVIEW WITH HUMAN

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

### Contracts (to be generated after approval):
- .workflows/specs/task-<name>.spec — 4 scenarios (set/get, miss, expiry, delete)
- .workflows/specs/task-<other>.spec — 3 scenarios

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
- Contract descriptions clear?
- Any missing?
- Approve to start execution?

### Wave execution summary:
```
Wave 0: TASK 1 (scout)
Wave 1: TASK 2 + TASK 3 (parallel, PARALLEL-GROUP: A)
Wave 2: TASK 4 (depends on wave 1)
Wave 3: TASK 5 (docs — optional)
→ /review (final gate + SHIP)
```
All tasks in a wave must complete before the next wave starts. `/next` enforces this. Verification runs per task (verdict gating) and once more at `/review` on the integrated whole.

## Phase 5: GENERATE CONTRACTS

Once the plan is approved, generate the `.spec` files for every worker task:

```bash
mkdir -p .workflows/specs
```

Read `templates/CONTRACT-FORMAT.md` (pi-workflows package: templates/ two dirs up from this skill) NOW — it holds
the normative contract template, the writing rules (every scenario has an
explicit `Test:` selector, boundaries list exact paths, optional
`max-rounds:` frontmatter), and a complete example contract. Generate one
`.spec` per worker task following it exactly.

For plans with **≥2 waves**, the default path is the spec-drafter fan-out from the
Drafting Pipeline; the fallback is hand-writing the specs.

Present the generated contracts to the human for a final quick check, then
proceed to handoff.

## Phase 6: HAND OFF

Once approved, tell the human:

```
Plan approved. Execute with:
  /next    → run the next pending task (verdict-gated, fix rounds on reject)
  /status  → show plan progress + cost summary
  /verify  → run mechanical verification on all contracts
  /review  → tier-2 gate + SHIP (commit + archive)
  /abort   → abandon the plan (archives to superseded)

Or run tasks manually:
  /scout   → TASK 1
  /add     → TASK 2, 3, ... (implements against contract)
  /fix     → fix a bug within contract boundaries
```

## Rules

- **Plans are living documents** — update `.workflows/plan.md` as you learn. Mark tasks done. Add notes.
- **Plans change** — if TASK 3 reveals that TASK 4 needs different scope, update the plan AND its contract. Don't silently deviate.
- **Every worker task has a contract** — if you can't write a contract, the task isn't atomic enough.
- **Contracts are validated before execution** — `/next` checks if the spec is still valid given completed work, and updates it if needed.
- **Scout first, always** — even if the human says "just build it." One scout task saves three rework tasks.
- **Contracts are reviewed, not code** — the human approves the contract. The machine verifies the implementation.
- **No model marks its own work done** — a task's ✅ comes only from a reviewer verdict `ok:true` (mechanical before judgment). Rejections trigger bounded fix rounds (worker role + rejection evidence verbatim), capped at the spec's `max-rounds` (default 2); reviewers verify, never fix; verdicts persist to `.workflows/reviews/<task-id>.md`.
- **Keep the human in the loop** — present after planning, not after building.
- **Bottleneck tags guide execution** — they tell /next which model/thinking to use.
- **Testing strategy is pre-assigned** — the worker follows the strategy, doesn't guess.
- **Parallel groups execute as waves** — all tasks in a wave must finish before the next wave starts. `/next` enforces this. Within a wave, tasks run as one pi-core-subagent call (`tasks[]`, disjoint boundaries required); model and thinking per task come from the bottleneck tag via `agents/registry.md`.
