---
description: "Show current plan.md progress with contract status and cost summary"
model: deepseek/deepseek-v4-flash
thinking: high
restore: true
---

Read `plan.md` in the current project and show a compact progress summary. Also check CONTEXT.md and docs/adr/ for additional status:

```bash
# Check if CONTEXT.md exists and when it was last updated
ls -la CONTEXT.md 2>/dev/null || echo "No CONTEXT.md"

# Count ADRs
ls docs/adr/*.md 2>/dev/null | wc -l | tr -d ' '
```

```
## Plan: <goal>
## Progress: X/N tasks done

✅ TASK 1: Scout <area>
✅ TASK 2: Build <thing> (specs/task-thing.spec ✅)
🔄 TASK 3: Build <other> (specs/task-other.spec 🔄 IN PROGRESS)
⬜ TASK 4: Verify all
❌ TASK 5: <failed task> (specs/task-five.spec ❌)

### Bottleneck Tags
- 🔴 BLOCKING: <count> tasks — needs strongest model
- 🟡 RISKY: <count> tasks — consider prototype first
- 🟠 VERIFICATION_HEAVY: <count> tasks — budget extra test time
- ⚪ STANDARD: <count> tasks

### Contracts:
- specs/task-thing.spec: ✅ all scenarios pass
- specs/task-other.spec: 🔄 in progress
- specs/task-five.spec: ❌ 2/4 scenarios fail

### Domain Memory
- CONTEXT.md: <last updated timestamp or "not created">
- ADRs: <count> created (docs/adr/)

### Cost Summary
- Total: $<total> (<total tokens> tokens)
- By task: TASK_1: $0.02, TASK_2: $0.07, TASK_3: $0.03
- Average per task: $<avg>

### Duration Summary
- Total: <time>
- By task: TASK_1: 30s, TASK_2: 2m 05s, TASK_3: 45s

### Next up: TASK 3 — <description>
### Blocked: none / TASK 4 blocked by TASK 3
```

If tasks have cost/duration data in plan.md, show the summary. If no cost data yet, show "Cost: not tracked yet (add cost/duration to completed tasks)."
If no plan.md exists, say "No plan.md found. Use /idea or /plan to create one."

$@
