---
description: "Show contract — display the agent-spec contract for a task"
model: deepseek/deepseek-v4-flash
thinking: high
restore: true
---

Display the contract for a task.

Usage:
- `/contract` — show contract for the current/pending task in .workflows/plan.md
- `/contract .workflows/specs/task-name.spec` — show a specific contract file

If no argument, read .workflows/plan.md to find the current task's contract file reference.

Run:
```bash
agent-spec contract <spec-file>
```

If agent-spec is not installed, read and display the .spec file contents directly.

$@
