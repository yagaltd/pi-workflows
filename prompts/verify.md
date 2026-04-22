---
description: "Verify — run agent-spec guard on all contracts + full project checks"
thinking: low
restore: true
---

Run the full verification pipeline across all contracts and the project:

1. Check if agent-spec is available: `which agent-spec`
2. If available, run:
   ```bash
   # Guard all specs against current changes
   agent-spec guard --spec-dir specs --code . --change-scope worktree --format json
   
   # Lifecycle on each spec individually
   for spec in specs/*.spec; do
     echo "=== $spec ==="
     agent-spec lifecycle "$spec" --code . --format json
   done
   ```
3. Run full project verification:
   ```bash
   # Adapt to project:
   npm test && npm run lint && npm run typecheck && npm run build
   ```
4. Report PASS/FAIL for each contract and overall

If agent-spec is not installed, note it and fall back to running project checks only.

$@
