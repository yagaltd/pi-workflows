---
description: "Execute the next pending task from plan.md (implements against contract, auto-checks docs)"
model: openrouter/trinity-large-thinking
thinking: medium
restore: true
---

Read `plan.md` in the current project. Find the first task with status `⬜ PENDING` whose dependencies are all `✅ DONE`.

### JIT Contract Writing

If the task is a `worker` task and has NO contract file yet (status `⏳ JIT` in the Contracts table):

1. Read plan.md Execution Notes for **learnings from completed tasks**
2. Read the task's goal, bottleneck tag, testing strategy, and dependencies
3. Use the architect agent to write a just-in-time `.spec` contract:
   ```bash
   mkdir -p specs
   ```
   Write the contract file at `specs/<task-id>.spec` with:
   - **Intent** — what to build and why (from the task's goal in plan.md)
   - **Decisions** — technical choices fixed from completed tasks + exploration
   - **Boundaries** — allowed/forbidden files (from plan.md context)
   - **Completion Criteria** — BDD scenarios with explicit `Test:` selectors
   - Incorporate learnings: if TASK 2 revealed a pattern, TASK 3's contract should reflect it
4. Update plan.md: mark the contract as ✅ written in the Contracts table
5. Then proceed to execute against the contract

If the contract already exists:
```bash
agent-spec contract <contract-file>
```
Understand the task's Intent, Decisions, Boundaries, and Completion Criteria before starting.

### Bottleneck-Based Model Adjustment

Before dispatching, check the task's bottleneck tag in plan.md:
- 🔴 BLOCKING → suggest high thinking model, human review after
- 🟡 RISKY → suggest medium thinking, warn about prototype need
- 🟠 VERIFICATION_HEAVY → suggest budgeting extra time for tests
- ⚪ STANDARD → default model/thinking

Execute the task using the appropriate workflow:

- If the task's agent is `scout`: use the explore skill to recon (no contract needed)
- If the task's agent is `worker`: 
  1. Read the contract
  2. Implement within Boundaries
  3. Write tests for every Completion Criteria scenario
  4. Self-verify with `agent-spec lifecycle <contract> --code .`
- If the task's agent is `reviewer`: run mechanical verification (agent-spec guard + tdd-guard + project checks)
- If the task's agent is `quality-reviewer`: run judgment-based code review AFTER mechanical verification passes
- If the task's agent is `human`: present the task and STOP

### Blocker Handling

If the worker output contains `WORKER_BLOCKER:`, extract the reason and:
- **invalid_contract**: Rewrite the contract and retry
- **unclear_requirement**: Ask the human for clarification
- **missing_dependency / missing_secret**: Ask the human to install/provide
- **unsafe_request / inaccessible_resource**: Report to human, skip task

After completing the task:
1. Run `agent-spec lifecycle <contract> --code . --layers lint,boundary,test,tdd-guard --format json` (if contract exists)
2. Run project verification (tests, lint, types, build)
3. Update `plan.md`: mark task status as ✅ DONE or ❌ FAILED
4. Add cost and duration to the task in plan.md:
   ```
   - **Cost**: $<estimate> (<tokens> tokens)
   - **Duration**: <time>
   ```
5. Add **learnings** to the Execution Notes section — what was discovered, what patterns worked, what to adjust for future tasks. These feed into JIT contract writing.
6. **Auto-check docs**: if any `docs/*.md` files exist, check if they need updating:
   ```bash
   find . -path '*/docs/*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null
   ```
   If docs exist and the task made architectural changes, run `/docs <area>` to update.
   If no relevant changes, skip silently.
7. **Write-ahead**: if the next 1-2 worker tasks have no contract yet, write their JIT contracts now (incorporating learnings from this task). This keeps the pipeline flowing.
8. Show what was done and what's next

$@
