---
description: "Verify — run agent-spec guard on all contracts + full project checks"
model: zai/GLM5.1
thinking: low
restore: true
---

Run the full verification pipeline across all contracts and the project. Ordered, short-circuit on fail.

## Layer 1: Contract Verification (agent-spec)

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
If any scenario fails or boundaries violated → report FAIL, STOP.

## Layer 2: Test Quality (tdd-guard)

If tdd-guard is installed:
```bash
tdd-guard lint --src src --tests tests --format json

for spec in specs/*.spec; do
  tdd-guard spec-verify --spec "$spec" --format json
done
```
If tdd-guard is not installed, note it and skip. If any rule fails → report FAIL, STOP.

## Layer 3: Project Toolchain

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

### Layer 2: tdd-guard
- Lint: pass / fail / skipped
- Spec-verify per spec: <results>

### Layer 3: project
- Tests: pass / fail
- Lint: pass / fail
- Types: pass / fail
- Build: pass / fail

### Overall: PASS / FAIL
```

If agent-spec is not installed, note it and fall back to running project checks only (Layer 3).

$@
