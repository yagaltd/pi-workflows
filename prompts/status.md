---
description: "Show current plan.md progress"
model: openrouter/xiaomi-mimo-v2-pro
thinking: low
restore: true
---

Read `plan.md` in the current project and show a compact progress summary:

```
## Plan: <goal>
## Progress: X/N tasks done

✅ TASK 1: Scout <area>
✅ TASK 2: Build <thing>
🔄 TASK 3: Build <other> (IN PROGRESS)
⬜ TASK 4: Verify all
❌ TASK 5: <failed task>

### Next up: TASK 3 — <description>
### Blocked: none / TASK 4 blocked by TASK 3
```

If no plan.md exists, say "No plan.md found. Use /idea or /plan to create one."
