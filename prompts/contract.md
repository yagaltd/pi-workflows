---
description: "Show contract — display the agent-spec contract for a task"
model: openrouter/xiaomi/mimo-v2-pro
thinking: low
restore: true
---

Display the contract for a task.

Usage:
- `/contract` — show contract for the current/pending task in plan.md
- `/contract specs/task-name.spec` — show a specific contract file

If no argument, read plan.md to find the current task's contract file reference.

Run:
```bash
agent-spec contract <spec-file>
```

If agent-spec is not installed, read and display the .spec file contents directly.

$@
