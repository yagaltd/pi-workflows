---
description: "Verify — run agent-spec guard on all contracts + full project checks"
model: zai/glm-5.1
thinking: low
restore: true
---

Run the full verification pipeline across all contracts and the project. Ordered, short-circuit on fail.

## Layer 1: Contract Verification (agent-spec)

1. Check if agent-spec is available: `which agent-spec`
2. If available, run:
   ```bash
   # Guard all specs against current changes
   agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree --format json
   
   # Lifecycle on each spec individually
   for spec in .workflows/specs/*.spec; do
     echo "=== $spec ==="
     agent-spec lifecycle "$spec" --code . --format json
   done
   ```
If any scenario fails or boundaries violated → report FAIL, STOP.

## Layer 2: Project Toolchain

```bash
# Adapt to project:
npm test && npm run lint && npm run typecheck && npm run build
```

## Report

```
## Verification: PASS / FAIL

### Layer 1: agent-spec
- Guard: <result>
- Lifecycle per spec: <results>

### Layer 2: project
- Tests: pass / fail
- Lint: pass / fail
- Types: pass / fail
- Build: pass / fail

### Overall: PASS / FAIL
```

If agent-spec is not installed, note it and fall back to running project checks only (Layer 3).

$@
