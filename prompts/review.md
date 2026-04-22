---
description: "Review — contract verification (agent-spec + bombadil + project checks)"
thinking: low
inheritContext: true
restore: true
---
Review the current state using contract verification:

1. Read plan.md to find the current task and its contract
2. If a .spec file exists: run `agent-spec lifecycle <spec> --code . --format json`
3. Check boundaries: `agent-spec guard --spec-dir specs --code . --change-scope worktree`
4. If web UI involved: run `bombadil test <url> <spec.ts> --exit-on-violation`
5. Run project checks: tests, lint, types, build
6. Produce PASS/FAIL verdict with evidence for each layer

$@
