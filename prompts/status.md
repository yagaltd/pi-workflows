---
description: "Show current plan.md progress with contract status"
thinking: low
restore: true
---

Read `plan.md` in the current project and show a compact progress summary:

```
## Plan: <goal>
## Progress: X/N tasks done

✅ TASK 1: Scout <area>
✅ TASK 2: Build <thing> (specs/task-thing.spec ✅)
🔄 TASK 3: Build <other> (specs/task-other.spec 🔄 IN PROGRESS)
⬜ TASK 4: Verify all
❌ TASK 5: <failed task> (specs/task-five.spec ❌)

### Contracts:
- specs/task-thing.spec: ✅ all scenarios pass
- specs/task-other.spec: 🔄 in progress
- specs/task-five.spec: ❌ 2/4 scenarios fail

### Next up: TASK 3 — <description>
### Blocked: none / TASK 4 blocked by TASK 3
```

If tasks have contracts, show their status too.
If no plan.md exists, say "No plan.md found. Use /idea or /plan to create one."
