---
description: "Execute the next pending task from plan.md (implements against contract, auto-checks docs)"
thinking: medium
restore: true
---

Read `plan.md` in the current project. Find the first task with status `⬜ PENDING` whose dependencies are all `✅ DONE`.

If the task has a contract file referenced, read it first:
```bash
agent-spec contract <contract-file>
```

Understand the task's Intent, Decisions, Boundaries, and Completion Criteria before starting.

Execute the task using the appropriate workflow:

- If the task's agent is `scout`: use the explore skill to recon (no contract needed)
- If the task's agent is `worker`: 
  1. Read the contract
  2. Implement within Boundaries
  3. Write tests for every Completion Criteria scenario
  4. Self-verify with `agent-spec lifecycle <contract> --code .`
- If the task's agent is `reviewer`: run `agent-spec guard --spec-dir specs --code .` + project checks
- If the task's agent is `human`: present the task and STOP

After completing the task:
1. Run `agent-spec lifecycle <contract> --code . --format json` (if contract exists)
2. Run project verification (tests, lint, types, build)
3. Update `plan.md`: mark task status as ✅ DONE or ❌ FAILED
4. Add any notes to the Execution Notes section
5. **Auto-check docs**: if any `# MAGIC DOC:` files exist, check if they need updating:
   ```bash
   grep -rl "^# MAGIC DOC:" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v .git
   ```
   If docs exist and the task made architectural changes, run `/docs <area>` to update.
   If no relevant changes, skip silently.
6. Show what was done and what's next

$@
