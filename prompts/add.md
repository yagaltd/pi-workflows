---
description: "Add feature — execute approved contract; broad ideas route to /idea"
model: deepseek/deepseek-v4-flash
thinking: high
skill: add-feature
restore: true
---

If a .spec file path is provided as argument, read the contract first:
```bash
agent-spec contract <spec-file>
```

If no spec file, only proceed for small surgical requests: mini-recon first, create a contract, ask approval. Broad or ambiguous ideas must route to `/idea`.

Implement within approved contract boundaries. Verify with agent-spec lifecycle.

$@
