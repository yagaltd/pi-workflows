---
description: "Fix bug — feedback loop, hypotheses, regression test, verifies with agent-spec"
model: deepseek/deepseek-v4-flash
thinking: medium
skill: fix
restore: true
---

## Input Sources

Accept fix requests from any of:
1. **Error text** — paste an error message or stack trace
2. **Spec file** — reference a .spec file that should pass
3. **Annotation** — `/annotate` output with selectors and screenshots (if pi-annotate installed)
4. **Screenshot** — describe what's wrong in a screenshot

$@
