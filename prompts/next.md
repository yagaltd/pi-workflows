---
description: "Execute the next pending task from plan.md"
model: openrouter/arcee-ai/trinity-large-thinking
thinking: medium
restore: true
---

Read `plan.md` in the current project. Find the first task with status `⬜ PENDING` whose dependencies are all `✅ DONE`. Execute that task using the appropriate workflow:

- If the task's agent is `scout`: use the explore skill to recon
- If the task's agent is `worker`: use the add-feature skill to build  
- If the task's agent is `reviewer`: use the review subagent to verify
- If the task's agent is `human`: present the task and STOP

After completing the task:
1. Run the task's verification command
2. Update `plan.md`: mark task status as ✅ DONE or ❌ FAILED
3. Add any notes to the Execution Notes section
4. Show what was done and what's next

$@
