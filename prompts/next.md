---
description: "Execute the next pending task from .workflows/plan.md (implements against contract, auto-checks docs)"
---

You are the orchestrator. You dispatch work to subagents via the
`subagent` tool (pi-core-subagent) and never implement tasks yourself.

First, read the dispatch policy: `agents/registry.md` in the pi-workflows
package (role prompts + model/thinking per bottleneck tag + isolation rules).

Ensure the `.workflows/` directory exists:

```bash
mkdir -p .workflows
```

Read `.workflows/plan.md` in the current project.

### Wave-Based Task Selection

Before picking a task, enforce **wave execution** to prevent parallel conflicts:

1. Read ALL tasks and their statuses
2. Identify **parallel groups** (tasks marked `[PARALLEL-GROUP: X]`)
3. If any parallel group has tasks that are `⬜ PENDING` or `🔄 IN PROGRESS`:
   - Do NOT start tasks from a LATER group, even if their deps are met
   - All tasks in the current wave must be `✅ DONE` or `❌ FAILED` before advancing
4. Pick the first task that is:
   - `⬜ PENDING`
   - All dependencies are `✅ DONE`
   - In the current active wave (or no wave restriction applies)

Wave rules:
- Tasks with NO parallel group = always eligible (wave 0)
- Tasks in `[PARALLEL-GROUP: A]` = wave 1 — all must finish before wave 2 starts
- Tasks in `[PARALLEL-GROUP: B]` = wave 2 — starts only after wave 1 is complete

If the current wave has multiple eligible tasks, ask the human:
```
Wave <N> has <X> parallel tasks ready:
  - TASK 2: <goal>
  - TASK 3: <goal>
Run all in parallel with subagents, or pick one?
```

Before dispatching a parallel wave, verify the tasks have **disjoint
`Allowed Changes` sets** in their contracts (children share one filesystem —
see registry isolation policy). If they overlap, run them sequentially.

### Spec Re-Validation

Before executing, check if the task's `.spec` contract is still valid given completed work:

1. Read the contract file referenced in `.workflows/plan.md`
2. Read Execution Notes for **learnings from completed tasks**
3. Check if any decisions in the contract conflict with what was actually built
4. If the spec is stale:
   - Update the contract to reflect reality (completed tasks may have changed boundaries, decisions, or patterns)
   - Log what changed in Execution Notes
   - If the change is significant (new boundary, changed intent), present to human before proceeding
5. If the spec is still valid, proceed

### Subagent Delegation (pi-core-subagent)

Every dispatch is **one subagent call** with inline agent definitions.
No agent files exist — you build each `tasks[]` entry from:

1. **Role prompt** — read the role file verbatim (`agents/<role>.md` in the
   pi-workflows package) and paste its body into `prompt:`
2. **Toolset** — from `agents/registry.md` (worker → `write: true`;
   reviewer → `tools: ["read","grep","find","ls","bash"]`; scout and
   quality-reviewer → read-only)
3. **Model + thinking** — from the task's bottleneck tag via the registry
   table. Leave `model` empty to inherit unless the tag demands otherwise.
4. **File context** — there is no `reads:` preloading. The `task:` text
   itself names every file the child must read first.

Use `background: false` so the result arrives inline in this turn — `/next`
is a deterministic one-task-at-a-time flow.

### Verdict gating (no model marks its own work done)

A worker settling is NOT completion. The task's `✅` in plan.md is written
**only after a reviewer verdict `ok:true`** — mechanical stage first, then
judgment. Every worker task therefore ends with this loop:

```
worker settles → reviewer (mechanical) → verdict
   ok:true → persist verdict → ✅ DONE
   ok:false → fix round N → re-review → verdict …
              (N capped at max-rounds, default 2)
   rounds exhausted → ❌ FAILED + verdict chain to the human
```

Rules:
- **Fix rounds are follow-up dispatches, never pre-declared graph nodes** —
  they exist only when a verdict rejects. Fix dispatches reuse the worker
  role with the rejection evidence prepended verbatim.
- **Reviewers verify, never fix.** The reject → fix → re-review triangle
  keeps evidence independent.
- **`max-rounds`** comes from the spec frontmatter (`max-rounds: N`,
  default 2). Exhausted rounds = ❌ FAILED, never an infinite loop.
- **Persist every verdict** (ok:true and ok:false alike) to
  `.workflows/reviews/<task-id>.md`, appending each round:

```markdown
# Review — <task-id>
Task: <goal> · Contract: <spec path>

## Round <N> — <date> · <reviewer|quality-reviewer>
**ok: false**
### Findings
1. [P1] <finding> — evidence: <file:line / failing output>

## Round <N+1> — <date> · reviewer
**ok: true**
```

  The verdict file is the fixer's input and `/review`'s audit trail.

#### Sequential dispatch with verdict gating (default shape)

Dispatch 1 — worker (task text as below). After it settles:

Dispatch 2 — reviewer:

```text
subagent({
  agent: "review-<task-id>",
  prompt: "<verbatim body of agents/reviewer.md>",
  tools: ["read","grep","find","ls","bash"],
  thinking: "high",            // xhigh when the task tag is 🔴 BLOCKING
  background: false,
  task: `Mechanical verification for TASK <N>: <goal>.
First read .workflows/specs/<task-id>.spec, then run in order, stop at
first failure: agent-spec lifecycle, guard, tdd-guard (if installed),
project checks (tests, lint, typecheck, build).
End with the Verdict block (ok: true|false + findings with evidence).`,
})
```

Parse the verdict:
- `ok:true` → append the round to `.workflows/reviews/<task-id>.md`, mark
  ✅, continue to "After the task completes".
- `ok:false` and round < max-rounds → **fix round**: dispatch the worker
  role again with:

```text
subagent({
  agent: "fix-<task-id>-<N>",
  prompt: "<verbatim body of agents/worker.md>",
  write: true,
  thinking: "high",            // fix rounds get high thinking
  background: false,
  task: `Fix round <N> for TASK <T>: <goal>.

## Rejection evidence (verbatim from the reviewer)
<the reviewer's findings + evidence, pasted verbatim>
Full verdict: .workflows/reviews/<task-id>.md

Correct ONLY what the findings name — same contract, same boundaries
(.workflows/specs/<task-id>.spec). No refactors, no drive-by fixes.
Re-run the verification pipeline after fixing.

Verify: agent-spec lifecycle .workflows/specs/<task-id>.spec --code . && <project test cmd>`,
})
```

  then re-dispatch the reviewer (round N+1). Repeat until ok:true or cap.
- `ok:false` at max-rounds → mark ❌ FAILED, append the final round, present
  the verdict chain to the human (every finding + what was attempted).

The same loop applies to the judgment stage: a quality-reviewer
`ok:false` (CHANGES_REQUESTED) triggers a fix round with the same cap —
only after mechanical ok:true.

#### Sequential worker task (default shape)

```text
subagent({
  agent: "worker-<task-id>",
  prompt: "<verbatim body of agents/worker.md>",
  write: true,
  thinking: "<from bottleneck tag: xhigh | high | medium>",
  background: false,
  task: `Implement TASK <N>: <goal>.

First read these files (in order):
1. .workflows/specs/<task-id>.spec — your contract: Intent, Decisions, Boundaries, Completion Criteria
2. .workflows/plan.md — task entry + Execution Notes for learnings from prior tasks
3. .workflows/CONTEXT.md — domain memory (if present)

## Workflow

### BUILD (TDD vertical slices)
For EACH scenario in the contract's Completion Criteria:
a. Write ONE test for that scenario → it fails (RED)
b. Write minimal code to pass it (GREEN)
c. Refactor if needed
Then run all tests → all pass.

### VERIFY (run in order, stop at first failure)
1. agent-spec lifecycle .workflows/specs/<task-id>.spec --code . --format json
2. agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
3. Project checks: tests, lint, typecheck, build

Verify: agent-spec lifecycle .workflows/specs/<task-id>.spec --code . && <project test cmd>

### Rules
- Simplicity first — no speculative features or abstractions
- Surgical changes — only what the contract requires
- Fail-fast error handling — propagate, never swallow
- Scope lock — if something outside is broken, note it, don't fix it
- If blocked and you truly need the human, output WORKER_BLOCKER JSON
  (reason, evidence, requestedAction) as your final answer.`,
})
```

#### Parallel worker wave (one call, graph mode)

All tasks in the wave go in ONE `tasks[]` array. Reviewer/quality-reviewer
follow the wave as **`needs:` edges** — pi-core-subagent gates them and
prepends the workers' outputs to their prompts automatically:

```text
subagent({
  background: false,
  concurrency: 4,
  tasks: [
    { id: "task-<2>", agent: "worker-task-2", prompt: "<agents/worker.md body>",
      write: true, thinking: "<per tag>",
      task: `Implement TASK 2: <goal>. First read .workflows/specs/task-2.spec ... <same workflow as above>` },
    { id: "task-<3>", agent: "worker-task-3", prompt: "<agents/worker.md body>",
      write: true, thinking: "<per tag>",
      task: `Implement TASK 3: <goal>. First read .workflows/specs/task-3.spec ... <same workflow as above>` },
    { id: "verify-<2-3>", agent: "reviewer", prompt: "<agents/reviewer.md body>",
      tools: ["read","grep","find","ls","bash"], thinking: "high",
      needs: ["task-2", "task-3"],
      task: `Mechanical verification for TASK 2 and TASK 3.
First read .workflows/plan.md and the two specs, then run in order, stop at first failure:
1. agent-spec lifecycle .workflows/specs/task-2.spec --code . --format json
2. agent-spec lifecycle .workflows/specs/task-3.spec --code . --format json
3. agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
4. Project checks (tests, lint, typecheck, build).
Report PASS/FAIL per layer with evidence. Mechanical only — no judgment.
Verify: agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree` },
  ],
})
```

Notes:
- **`needs` replaces wave bookkeeping**: the reviewer task starts only when
  both workers settle; a failed worker auto-aborts the reviewer (a broken
  upstream must not be reviewed) — that abort is your signal the task failed.
- Hard limits: ≤16 tasks per call, concurrency ≤8.
- With `background: false`, the call returns when the whole graph settles.
- **Verdict gating applies per task in the wave**: parse each worker's
  verdict from the reviewer's output; run fix rounds (follow-up calls, per
  the verdict-gating section) for every ok:false before advancing the wave.
  The reviewer task text must end: "Report per task: TASK <n>: ok <true|false>
  + findings. End with one Verdict block per task."

#### Scout tasks

```text
subagent({
  agent: "scout-<task-id>",
  prompt: "<verbatim body of agents/scout.md>",
  thinking: "low",            // cheap recon — see registry
  background: false,
  task: `Investigate <area> for TASK <N>: <goal>.

First read domain memory (if present): .workflows/CONTEXT.md,
.workflows/CONTEXT-MAP.md, .workflows/docs/adr/*.md — then recon the area.
Output format per your role prompt (Files Retrieved, Key Code, Domain
Memory, Architecture, Start Here).`,
})
```

After a scout settles, persist its report verbatim to
`.workflows/knowledge/scout-<task-id>.md` (mkdir -p the dir) — scouts are
read-only by design; the orchestrator is the single writer. Later tasks,
contracts, and `/idea` sessions cite these files instead of re-running recon.
(`/brainstorm` research angles use the same doctrine but persist under
`.workflows/research/<slug>/` — see the brainstorm skill.)
Then continue with the normal post-task steps below.

#### Reviewer / quality-reviewer tasks

Same shape as the graph-mode reviewer entry above (single-task form: no
`needs`). Reviewer = mechanical pipeline from `agents/reviewer.md`;
quality-reviewer = judgment review from `agents/quality-reviewer.md`, runs
only after the reviewer passes.

#### Blocker Handling

If a worker's final output contains `WORKER_BLOCKER:`, extract the reason and:
- **invalid_contract**: Rewrite the contract and retry
- **unclear_requirement**: Ask the human for clarification
- **missing_dependency / missing_secret**: Ask the human to install/provide
- **unsafe_request / inaccessible_resource**: Report to human, skip task

For long autonomous runs, consider `allowIntercom: true` so workers can
`ask_parent` mid-task instead of burning the whole task to report a blocker.

### After the task completes (verdict ok:true only)

1. **Ground truth first**: run `git diff --stat` — the diff is what changed,
   not the child's self-report. Files outside the contract's Allowed Changes
   → investigate before marking done.
2. Run `agent-spec lifecycle <contract> --code . --layers lint,boundary,test --format json` (if contract exists)
3. Run project verification (tests, lint, types, build)
4. **(If code changed)** Run adversarial verification:
   ```text
   subagent({
     agent: "bug-hunter-<task-id>",
     prompt: "You are the bug-hunter runtime. Read ~/.pi/agent/skills/bug-hunter/SKILL.md
              (or ./.pi/skills/bug-hunter/SKILL.md) and modes/local-sequential.md,
              then follow the protocol EXACTLY: scan-only, single-pass, fail
              closed. Never fix, never commit.",
     write: true, thinking: "high", background: false,
     task: "Scan the current changes (git diff) for defects. Report findings
            with severity, file paths, and evidence."
   })
   ```
5. Update `.workflows/plan.md`: mark task status as ✅ DONE or ❌ FAILED
6. Add cost and duration to the task in .workflows/plan.md:
   ```
   - **Cost**: $<from subagent usage> (<tokens> tokens)
   - **Duration**: <time>
   ```
7. Add **learnings** to the Execution Notes section — what was discovered, what patterns worked, what to adjust for future tasks.
8. **Update .workflows/CONTEXT.md**: if any domain decisions were made during this task, update .workflows/CONTEXT.md immediately. If an architecture decision meets all 3 criteria (hard to reverse, surprising, real tradeoff), create an ADR in .workflows/docs/adr/.
9. **Auto-check docs**: if any `.workflows/docs/*.md` files exist, check if they need updating:
   ```bash
   find . -path '*/docs/*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null
   ```
   If docs exist and the task made architectural changes, run `/docs <area>` to update.
   If no relevant changes, skip silently.
10. **Validate downstream specs**: check if the next 1-2 pending tasks' contracts need updating based on learnings from this task. If they do, update them now and note the changes. If a contract changed, present to human before proceeding.
11. Show what was done and what's next

$@
