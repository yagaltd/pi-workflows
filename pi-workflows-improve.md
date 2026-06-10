# pi-workflows Improvement Plan

Consolidated recommendations from audit. Implementation order: priority high → low.

---

## P0 — Structural Cleanup

### 1. Remove tdd-guard as dependency

**Why:** Always skipped in practice (separate npm package rarely installed). agent-spec lifecycle + project checks already catch contract violations. tdd-guard's test quality checks are redundant when agent-spec scenarios already pass.

**Files to change:**
- `package.json` — remove `tdd-guard` from `peerDependencies`
- `.pi/agents/reviewer.md` — remove Layer 2 references
- `prompts/next.md` — remove from worker instructions, reviewer delegation, and post-task verification
- `prompts/verify.md` — remove tdd-guard section

### 2. Remove dead prompts

| File | Reason |
|---|---|
| `prompts/scout.md` | Orphaned — `/scout` uses `skill: explore`, not this file. Remove. |
| `prompts/integrate.md` | Redundant — identical to `/add` (`skill: add-feature`). Remove. |

### 3. Consolidate review / verify

Currently both run the same agent-spec lifecycle + project checks inline.
- `/verify` → keep as the full suite (all contracts, full project)
- `/review` → make it call `/verify` then run quality-reviewer subagent

---

## P0 — Pipeline Upgrades

### 4. Add /challenge command (from grill-with-docs)

**Purpose:** Adversarial Q&A that challenges the user's plan BEFORE building. Fills the gap: "no one challenged my assumptions."

**Behavior:**
```
/challenge <plan or idea>
```

1. Reads `plan.md`, `CONTEXT.md`, `docs/adr/*.md`, relevant source files
2. Walks the decision tree one question at a time
3. For each question: provides recommended answer, cross-references code, sharpens vague terminology
4. Updates `CONTEXT.md` **inline** as terms are resolved
5. Creates ADRs when all 3 criteria met: hard to reverse + surprising + real tradeoff
6. Outputs: finalized `CONTEXT.md` + confirmed plan

**Implementation:** New `prompts/challenge.md` with `skill: challenge`. New `skills/challenge/SKILL.md` with the grill-with-docs workflow adapted for pi-subagents.

### 5. Add CONTEXT.md auto-update to /next

In `prompts/next.md`, "After completing the task" section, add:

```
  → Update CONTEXT.md with any domain decisions discovered during this task
  → If an architecture decision meets all 3 criteria:
    - Hard to reverse
    - Surprising without context  
    - Result of a real trade-off
    → Create ADR in docs/adr/
  → Verify plan.md specs are still valid; if decisions changed, rewrite pending contracts
```

This prevents the common failure: plan.md goes stale, CONTEXT.md never gets written, next worker repeats same mistakes.

### 6. Switch worker to TDD vertical slices

Current worker approach (bulk):
```
1. Read contract
2. Write all code
3. Write all tests
4. Self-verify
```

Proposed TDD approach:
```
1. Read contract
2. For EACH scenario in Completion Criteria:
   a. Write ONE test for that scenario → it fails (RED)
   b. Write minimal code to pass it (GREEN)
   c. Refactor if needed
3. Run all tests → they all pass
4. Run full verification
```

**Why:** Tests match real behavior, not imagined behavior. Interface design issues surface after test 1, not after all 10 tests fail. Avoids the "horizontal slicing" anti-pattern (writing all tests first against speculative APIs).

**Files to change:** `prompts/next.md` — worker task template (the BUILD section).

### 7. Add UI branch to /prototype

Current `/prototype`: N parallel backend/PoC workers only.

Add a UI mode. When the target is a UI component/page:
```
/prototype --ui "Checkout page redesign"
```

Spawn N parallel workers, each generates a radically different visual design:

```
subagent({
  tasks: [
    { agent: "worker", task: "Build UI variation A: minimal/clean checkout..." },
    { agent: "worker", task: "Build UI variation B: wizard-style multi-step checkout..." },
    { agent: "worker", task: "Build UI variation C: sidebar summary always visible..." },
  ],
  concurrency: 3,
  worktree: true
})
```

Each variation:
- Is a single HTML file or component
- Is runnable with one command
- Surfaces state after every user action
- Is clearly marked as throwaway

After all complete, present side-by-side for user to pick.

**Files to change:** `prompts/prototype.md` — detect UI vs backend, branch accordingly.

---

## P1 — Verification Upgrades

### 8. Integrate bug-hunter into verification

After a worker task completes, run adversarial scanning:

```
subagent({
  agent: "bug-hunter",
  task: `Run bug-hunter --staged --scan-only on the current changes.
Report all findings with severity, file paths, and evidence.`,
  progress: true
})
```

This replaces the `quality-reviewer`'s manual judgment with a structured, adversarial pipeline (Recon → Hunter → Skeptic → Referee).

**Add to `prompts/next.md`** "After completing" section, after project checks.

### 9. Integrate open-code-review into verification

After worker and bug-hunter, run line-level AI review on the diff:

```
ocr review --audience agent --format json
```

open-code-review generates structured line-level comments with `start_line`/`end_line`. These feed directly into the fix loop if issues are found.

**Add to `prompts/next.md`** "After completing" section, after bug-hunter.

---

## P1 — Goal Integration

### 10. Add /goal creation for each subagent

When `/next` dispatches a subagent, create a goal for that subagent session:

```
Before subagent:
  → create_goal({ objective: "Implement TASK N: <goal> within contract specs/task-N.spec" })
  → subagent works, self-verifies
  → update_goal({ status: "complete" })
```

And a goal for the orchestrator for the current wave:

```
Before wave starts:
  → create_goal({ objective: "Complete wave X: <wave description>" })
After wave completes:
  → update_goal({ status: "complete" })
```

**Why:** Forces subagents to stay on track. Goal drift = failing the goal = signal to orchestrator. Also tracks progress transparently.

**Files to change:** `prompts/next.md` — wrap subagent dispatch with create/update goal calls.

---

## P1 — Documentation & ADR improvements

### 11. Add CONTEXT-FORMAT.md and ADR-FORMAT.md templates

From grill-with-docs:
- `templates/CONTEXT-FORMAT.md` — how to write CONTEXT.md entries (glossary only, no implementation details)
- `templates/ADR-FORMAT.md` — ADR template (title, status, context, decision, consequences)

These are referenced by `/challenge` and the auto-update steps in `/next`.

### 12. Plan.md drift prevention

Add to `/next` "After completing" section:

```
  → Validate downstream specs: check if the next 1-2 pending tasks' contracts 
    need updating based on learnings from this task
  → If a contract changed: note the change, present to human before proceeding
```

This already exists in `next.md` as point 7, but is often skipped. Add explicit subagent call for this:

```
subagent({
  agent: "delegate",
  task: `Check if pending task contracts need updating based on learnings from completed TASK N.
Read plan.md, spec files for next 1-2 pending tasks, and the Execution Notes.
If any decisions, boundaries, or patterns changed: rewrite the affected specs.
Report what changed and why.`,
  reads: ["plan.md"],
  progress: true
})
```

---

## P2 — Nice-to-haves

### 13. Remove openrouter/xiaomi/mimo-v2-pro references

All prompts already updated to `deepseek/deepseek-v4-flash`. Verify no remaining stale model references in the codebase (README.md, template files).

### 14. /status improvements

Add to `/status`:
- Subagent goal completion status
- CONTEXT.md last updated timestamp
- Number of ADRs created vs tasks completed

---

## Implementation Order

```
Phase 1 (do first):
  ─ Remove tdd-guard from package.json + all prompts
  ─ Remove scout.md, integrate.md
  ─ Add CONTEXT.md update enforcement to next.md
  ─ Switch worker to TDD vertical slices in next.md

Phase 2 (core new feature):
  ─ Build /challenge prompt + skill (from grill-with-docs)
  ─ Add CONTEXT-FORMAT.md + ADR-FORMAT.md templates

Phase 3 (verification):
  ─ Integrate bug-hunter into next.md post-task
  ─ Integrate open-code-review into next.md post-task

Phase 4 (goals):
  ─ Add create_goal / update_goal around subagent dispatch
  ─ Add create_goal / update_goal around wave dispatch

Phase 5 (polish):
  ─ Add UI branch to /prototype
  ─ Consolidate review / verify
  ─ /status improvements
  ─ Clean up stale model references in docs
```
