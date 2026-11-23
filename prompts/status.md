---
description: "Show current .workflows/plan.md progress with contract status and cost summary"
---
# `/status`

Read `.workflows/plan.md` in the current project and show a compact progress
summary. Also check .workflows/CONTEXT.md and .workflows/docs/adr/ for
additional status:

```bash
# Check if .workflows/CONTEXT.md exists and when it was last updated
ls -la .workflows/CONTEXT.md 2>/dev/null || echo "No .workflows/CONTEXT.md"

# Count ADRs
ls .workflows/docs/adr/*.md 2>/dev/null | wc -l | tr -d ' '

# Archive history (versioned plans)
ls .workflows/archive/done .workflows/archive/superseded 2>/dev/null || echo "No archived plans"
```

## Output Format (TASK 1 Policy)

Use the policy result from `decideOutputPolicy` as given: this prompt owns no
thresholds, chooser logic, or judge call. Assemble the report in this order:

1. Prepend a short prose summary (one or two sentences) - plan goal,
   done/total tasks, and the next action or blocker - before the `## Plan:`
   header.
2. On the line below it, show only the display-only status tokens that apply:
   `[[Done]]`, `[[Decision]]`, `[[Pending]]`, `[[Failed]]`, `[[Unverified]]`.
   Tokens decorate the reply only; never write them into `.workflows/plan.md`
   or any tracked file. Prose summary and tokens are always present.
3. Then render the canonical Markdown status report below, starting at
   `## Plan:` and ending at `### Blocked:`, unchanged and in this order.
4. Only when the policy result has `diagram: true` and a generated artifact
   with alt text is available, append that image with its alt text after the
   complete text report. The text report stays complete and readable without
   it; with no diagram positive, emit no image reference at all. A diagram is
   an additive generated view, never a replacement for the text.

Header: `## Plan: <goal> · <PlanID> · Status: <status>`, plus an archive line
listing prior plan ids (`archived: 3 done, 1 superseded` or `none`).

**Hygiene check** (report, don't fix): count ✅ tasks whose Execution Notes
lack a `context:` marker — report as `context markers: X/Y` (Y = ✅ count).
Missing markers mean the CONTEXT.md update step was skipped on those tasks;
they'll be swept at `/review` SHIP.

```text
## Plan: <goal>
## Progress: X/N tasks done

✅ TASK 1: Scout <area>
✅ TASK 2: Build <thing> (.workflows/specs/task-thing.spec ✅)
🔄 TASK 3: Build <other> (.workflows/specs/task-other.spec 🔄 IN PROGRESS)
⬜ TASK 4: Verify all
❌ TASK 5: <failed task> (.workflows/specs/task-five.spec ❌)

### Bottleneck Tags
- 🔴 BLOCKING: <count> tasks — needs strongest model
- 🟡 RISKY: <count> tasks — consider prototype first
- 🟠 VERIFICATION_HEAVY: <count> tasks — budget extra test time
- ⚪ STANDARD: <count> tasks

### Contracts:
- .workflows/specs/task-thing.spec: ✅ all scenarios pass
- .workflows/specs/task-other.spec: 🔄 in progress
- .workflows/specs/task-five.spec: ❌ 2/4 scenarios fail

### Domain Memory
- .workflows/CONTEXT.md: <last updated timestamp or "not created">
- ADRs: <count> created (.workflows/docs/adr/)

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

If tasks have cost/duration data in .workflows/plan.md, show the summary. If no
cost data yet, show "Cost: not tracked yet (add cost/duration to completed
tasks)."
If no .workflows/plan.md exists, say "No .workflows/plan.md found. Use /idea or
/plan to create one."

$@
