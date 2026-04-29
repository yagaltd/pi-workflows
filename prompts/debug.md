---
description: "Debug — hypothesis-driven investigation for complex bugs"
model: deepseek/deepseek-v4-flash
thinking: high
skill: fix
restore: true
---

For complex, non-obvious bugs (multiple failed fix attempts, environment-specific, intermittent), use full diagnose mode:

1. FEEDBACK LOOP: create fastest reliable pass/fail signal
2. REPRODUCE: confirm exact user symptom
3. HYPOTHESIZE: generate 3-5 falsifiable causes with evidence
4. INSTRUMENT: verify one hypothesis at a time, tag temp logs `[DEBUG-xxxx]`
5. FIX: minimal change with regression test
6. VERIFY + CLEANUP: original loop passes, debug artifacts removed

Hard rules:
- No fix code until reproducible loop exists or inability is reported
- No single-hypothesis anchoring; rank 3-5 hypotheses first
- One probe per hypothesis
- Revert experiments after recording results
- Anti-bulldozer: if 3 attempts failed, improve feedback loop

For obvious bugs (typos, clear errors), use /fix directly instead.

$@
