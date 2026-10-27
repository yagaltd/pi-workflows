---
description: "Add feature — execute approved contract; broad ideas route to /idea"
---

Follow the 'add-feature' skill workflow — load its SKILL.md with the read tool, then execute it.

If a .spec file path is provided as argument, read the contract first:
```bash
agent-spec contract <spec-file>
```

If no spec file, classify the request tier first (plan 20261026-033):
- **problem** — no solution chosen; broad or ambiguous → route to `/idea` (divergent → `/brainstorm`)
- **solution** — approach chosen, design open → route to `/plan` for the contract set
- **procedure** — small surgical request, exact steps known → mini-recon first, create a contract, ask approval here

Implement within approved contract boundaries. Verify with agent-spec lifecycle.

$@
