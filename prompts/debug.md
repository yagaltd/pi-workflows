---
description: "Debug — hypothesis-driven investigation for complex bugs"
thinking: high
skill: fix
restore: true
---

For complex, non-obvious bugs (multiple failed fix attempts, environment-specific, intermittent), use the hypothesis-driven debugging approach:

1. OBSERVE: reproduce, get exact error, find minimal reproduction
2. HYPOTHESIZE: generate 3-5 possible causes with evidence
3. EXPERIMENT: test root hypothesis with ≤5 lines, try to FALSIFY
4. CONCLUDE: confirm root cause, write fix + regression test

Hard rules:
- Everything in DEBUG.md
- No fix code until hypothesis PROVEN
- Each experiment ≤5 lines
- Revert experiments after recording results
- Anti-bulldozer: if 3 attempts failed, go back to Observe

For obvious bugs (typos, clear errors), use /fix directly instead.

$@
