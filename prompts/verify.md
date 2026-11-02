---
description: "Verify — run agent-spec guard on all contracts + full project checks"
---

Run the full verification pipeline across all contracts and the project. Ordered, short-circuit on fail.

## Layer 1: Contract Verification (agent-spec)

1. Check if agent-spec is available: `which agent-spec`
2. If available, run (probe-aware, plan 20261031-048 — mirrors
   `specGuardSupport` in scripts/flow-gates.mjs):
   ```bash
   # Probe once: does this agent-spec support per-spec guard (--spec)?
   if agent-spec guard --help 2>&1 | grep -q -- '--spec '; then
     # Guard each spec individually (per-spec scoping, plan 20261031-047):
     # any failing spec fails the gate; skip-only lifecycle verdicts are reported.
     for spec in .workflows/specs/*.spec; do
       echo "=== $spec ==="
       agent-spec guard --spec "$spec" --code . --change-scope worktree --format json || { echo "FAIL: $spec"; exit 1; }
     done
   else
     # Loud degradation (plan 20261031-048): --spec-less agent-spec (e.g. 0.2.7)
     # gets one aggregate guard — skip-only specs count as failing, so reviewers
     # must scope boundaries per task by hand. Never degrade silently. Note:
     # 0.2.7 also lacks --format, so the aggregate run uses plain output.
     echo "warning: agent-spec lacks --spec — using aggregate --spec-dir form (skip-only specs count as failing; reviewers judge boundaries scoped per task)" >&2
     agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree || { echo "FAIL: aggregate guard"; exit 1; }
   fi
   ```
   For each probe the reviewer runs, record it as a proof:
   ```bash
   node scripts/proof-ledger.mjs record --plan <id> --task <t> --runner reviewer --kind replayable --verify "<probe>"
   ```
   (use `--kind not_replayable` for prose/one-shot checks).
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
