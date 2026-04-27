---
description: "Execute the next pending task from plan.md (implements against contract, auto-checks docs)"
thinking: medium
restore: true
---

Read `plan.md` in the current project. Find the first task with status `⬜ PENDING` whose dependencies are all `✅ DONE`.

### Spec Re-Validation

Before executing, check if the task's `.spec` contract is still valid given completed work:

1. Read the contract file referenced in `plan.md`
2. Read Execution Notes for **learnings from completed tasks**
3. Check if any decisions in the contract conflict with what was actually built
4. If the spec is stale:
   - Update the contract to reflect reality (completed tasks may have changed boundaries, decisions, or patterns)
   - Log what changed in Execution Notes
   - If the change is significant (new boundary, changed intent), present to human before proceeding
5. If the spec is still valid, proceed

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
5. Add **learnings** to the Execution Notes section — what was discovered, what patterns worked, what to adjust for future tasks.
6. **Auto-check docs**: if any `docs/*.md` files exist, check if they need updating:
   ```bash
   find . -path '*/docs/*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null
   ```
   If docs exist and the task made architectural changes, run `/docs <area>` to update.
   If no relevant changes, skip silently.
7. **Validate downstream specs**: check if the next 1-2 pending tasks' contracts need updating based on learnings from this task. If they do, update them now and note the changes.
8. Show what was done and what's next

$@
