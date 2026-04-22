---
description: "Add feature — implements against contract, verifies with agent-spec"
thinking: high
skill: add-feature
restore: true
---

If a .spec file path is provided as argument, read the contract first:
```bash
agent-spec contract <spec-file>
```

If no spec file, the skill will create one from the feature description.

Implement within contract boundaries. Verify with agent-spec lifecycle.

$@
