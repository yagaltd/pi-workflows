---
description: "Review — mechanical verification then quality review"
model: zai/glm-5.1
thinking: low
inheritContext: true
restore: true
---

Run a two-stage review:

## Stage 1: Mechanical Verification (reviewer agent)

Read plan.md to find the current task and its contract.

### Layer 1: Contract Verification (agent-spec)
```bash
agent-spec lifecycle <spec> --code . --format json
```
If any scenario fails → report FAIL, STOP. No quality review needed.

### Layer 1b: Boundary Guard
```bash
agent-spec guard --spec-dir specs --code . --change-scope worktree
```
If boundary violated → report FAIL, STOP.

### Layer 2: Test Quality (tdd-guard, if installed)
```bash
tdd-guard lint --src src --tests tests --format json
tdd-guard spec-verify --spec <spec> --format json
```
If any rule fails → report FAIL, STOP.

### Layer 3: Project Checks
```bash
npm test && npm run lint && npm run typecheck && npm run build
```

Report PASS/FAIL for each layer. If Stage 1 FAILS → stop here.

## Stage 2: Quality Review (quality-reviewer agent, only if Stage 1 PASSES)

Run `git diff` to see what changed. Apply judgment-based review:

1. **Simplicity**: unnecessary abstractions, overcomplicated code
2. **Security**: untrusted input handling, SQL injection, open redirects
3. **Error handling**: swallowed errors, silent failures
4. **Surgical changes**: unnecessary modifications beyond task scope

High bar for findings — empty review = clean code = success.
Report P0-P3 issues with file paths and evidence.
Include human callouts (new deps, auth changes, migrations).

## Combined Output

```
## Review: PASS / FAIL

### Stage 1: Mechanical Verification
- agent-spec lifecycle: X/Y scenarios pass
- agent-spec guard: boundaries respected / violations
- tdd-guard: pass / fail / skipped
- Tests: pass / fail
- Lint: pass / fail
- Types: pass / fail
- Build: pass / fail

### Stage 2: Quality Review (skipped if Stage 1 failed)
- Findings: <list or "none">
- Human callouts: <list or "none">
```

$@
