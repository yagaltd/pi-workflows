---
description: "Execute the next pending task from .workflows/plan.md (implements against contract, auto-checks docs)"
model: deepseek/deepseek-v4-flash
thinking: medium
restore: true
---

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
- Within a wave, tasks run in parallel via pi-subagents (see below)

If the current wave has multiple eligible tasks, ask the human:
```
Wave <N> has <X> parallel tasks ready:
  - TASK 2: <goal>
  - TASK 3: <goal>
Run all in parallel with subagents, or pick one?
```

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

### Bottleneck-Based Model Guidance

Before dispatching, check the task's bottleneck tag in .workflows/plan.md:
- 🔴 BLOCKING → use highest thinking model, human review after
- 🟡 RISKY → medium thinking, consider prototype first
- 🟠 VERIFICATION_HEAVY → budget extra time for tests
- ⚪ STANDARD → default

### Subagent Delegation

For ALL task types (`worker`, `scout`, `reviewer`, `quality-reviewer`), delegate to a subagent with the full workflow instructions embedded in the task prompt. This ensures subagents have the same high-quality instructions as inline skill execution.

**Before dispatching any subagent**, create a goal for it:
```
create_goal({ objective: "TASK <N>: <goal> — implement within contract .workflows/specs/<task-id>.spec" })
```
This ensures the subagent stays on track and completion is verifiable.

**After the subagent completes**, update the goal:
```
update_goal({ status: "complete" })
```

#### Worker tasks

Embed the BUILD + VERIFY workflow from the add-feature skill:

```
subagent({
  agent: "worker",
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
1. Contract verification:
   agent-spec lifecycle .workflows/specs/<task-id>.spec --code . --format json
   agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
2. Project checks: tests, lint, typecheck, build

### Coding Rules
- Simplicity first — no speculative features or abstractions
- Surgical changes — only what the contract requires
- Fail-fast error handling — propagate, never swallow
- Scope lock — if something outside is broken, note it, don't fix it
- If blocked, output WORKER_BLOCKER JSON with reason and evidence
`,
  reads: [".workflows/plan.md", ".workflows/specs/<task-id>.spec"],
  progress: true
})
```

#### Parallel worker tasks (waves)

Same instructions, each task gets its own spec file:

```
subagent({
  tasks: [
    {
      agent: "worker",
      task: `Implement TASK 2: <goal>.\n\nRead the contract at .workflows/specs/task-2.spec.\n\n## Workflow\n\n### BUILD (TDD)\nFor EACH scenario: write test (RED) → implement (GREEN) → refactor\n\n### VERIFY\n1. agent-spec lifecycle .workflows/specs/task-2.spec --code .\n2. agent-spec guard\n3. Project checks\n\n### Rules\n- Simplicity first, surgical changes, fail-fast\n- If blocked, output WORKER_BLOCKER`,
      reads: [".workflows/plan.md", ".workflows/specs/task-2.spec"]
    },
    {
      agent: "worker",
      task: `Implement TASK 3: <goal>.\n\nRead the contract at .workflows/specs/task-3.spec.\n\n## Workflow\n\n### BUILD (TDD)\nFor EACH scenario: write test (RED) → implement (GREEN) → refactor\n\n### VERIFY\n1. agent-spec lifecycle .workflows/specs/task-3.spec --code .\n2. agent-spec guard\n3. Project checks\n\n### Rules\n- Simplicity first, surgical changes, fail-fast\n- If blocked, output WORKER_BLOCKER`,
      reads: [".workflows/plan.md", ".workflows/specs/task-3.spec"]
    },
  ],
  concurrency: 4,
  worktree: true
})
```

#### Scout tasks

```
subagent({
  agent: "scout",
  task: `Investigate <area> for TASK <N>: <goal>.

## Instructions
1. Read domain memory: .workflows/CONTEXT.md, .workflows/CONTEXT-MAP.md, .workflows/docs/adr/*.md if present
2. grep/find relevant code, tests, routes, config
3. Read key sections (use offset/limit, not entire files)
4. Identify types, interfaces, key functions
5. Map dependencies between files
6. Flag conflicts between task wording, glossary, ADRs, and code

## Output format
- Files Retrieved (exact paths + line ranges)
- Key Code (critical types, interfaces, functions)
- Domain Memory (relevant terms and conflicts)
- Architecture (how pieces connect)
- Start Here (first file to look at and why)

NEVER modify source files.`,
  reads: [".workflows/plan.md"],
  progress: true
})
```

#### Reviewer tasks

```
subagent({
  agent: "reviewer",
  task: `Run contract verification for TASK <N>: <goal>.

Contract: .workflows/specs/<task-id>.spec

Run in order. Stop at first failure.

1. agent-spec lifecycle .workflows/specs/<task-id>.spec --code . --format json
2. agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
3. Project checks: tests, lint, typecheck, build

Report PASS/FAIL per layer with evidence. Mechanical only — no judgment.`,
  reads: [".workflows/plan.md", ".workflows/specs/<task-id>.spec"],
  progress: true
})
```

#### Quality-reviewer tasks

```
subagent({
  agent: "quality-reviewer",
  task: `Quality review for TASK <N>: <goal>.

Assume mechanical verification passed. Check:
1. Simplicity: unnecessary abstractions, overcomplication
2. Security: untrusted input, injection, auth
3. Error handling: swallowed errors, silent failures
4. Surgical changes: modifications beyond scope
5. Domain fit: conflicts with .workflows/CONTEXT.md, ADRs

Priority: P0 (blocking) > P1 (urgent) > P2 (normal) > P3 (low)

Output: APPROVED / CHANGES_REQUESTED with findings and file references.
High bar — empty review = clean code = success.`,
  reads: [".workflows/plan.md", ".workflows/specs/<task-id>.spec"],
  progress: true
})
```

Use `worktree: true` for parallel worker tasks to isolate filesystem changes. Sequential tasks don't need worktrees.

### Blocker Handling

If the worker output contains `WORKER_BLOCKER:`, extract the reason and:
- **invalid_contract**: Rewrite the contract and retry
- **unclear_requirement**: Ask the human for clarification
- **missing_dependency / missing_secret**: Ask the human to install/provide
- **unsafe_request / inaccessible_resource**: Report to human, skip task

After completing the task:
1. Run `agent-spec lifecycle <contract> --code . --layers lint,boundary,test --format json` (if contract exists)
2. Run project verification (tests, lint, types, build)
3. **(If code changed)** Run adversarial verification:
   ```
   subagent({
     agent: "bug-hunter",
     task: `Run bug-hunter --staged --scan-only on the current changes.
   Report all findings with severity, file paths, and evidence.`,
     progress: true
   })
   ```
4. **(If code changed)** Run line-level AI review:
   ```bash
   ocr review --audience agent --format json 2>/dev/null || echo "ocr not installed, skip"
   ```
5. Update `.workflows/plan.md`: mark task status as ✅ DONE or ❌ FAILED
6. Add cost and duration to the task in .workflows/plan.md:
   ```
   - **Cost**: $<estimate> (<tokens> tokens)
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
11. **Update goal**: call update_goal({ status: "complete" }) for this task's goal.
12. Show what was done and what's next

$@
