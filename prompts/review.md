---
description: "Review — run /verify first, then quality review with bug-hunter + judgment"
---

Run a two-stage review.

## Stage 1: Mechanical Verification

First, run the full verification suite (same as `/verify`):

### Layer 1: Contract Verification (agent-spec)

```bash
# Guard all specs against current changes
agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree --format json

# Lifecycle on each spec individually
for spec in .workflows/specs/*.spec; do
  echo "=== $spec ==="
  agent-spec lifecycle "$spec" --code . --format json
done
```
If any scenario fails or boundaries violated → report FAIL, STOP. No quality review needed.

### Layer 2: Project Checks

```bash
npm test && npm run lint && npm run typecheck && npm run build
# Adapt to project stack
```

If Stage 1 FAILS → stop here.

## Stage 2: Adversarial + Quality Review (only if Stage 1 PASSES)

### Step 1: Bug-hunter scan (subagent, not CLI)

The `bug-hunter` binary is an installer, not a scanner — the protocol is
agent-driven. Dispatch it as a write-toolset subagent:

```text
subagent({
  agent: "bug-hunter-review",
  prompt: "You are the bug-hunter runtime. Read ~/.pi/agent/skills/bug-hunter/SKILL.md
           (or ./.pi/skills/bug-hunter/SKILL.md) and modes/local-sequential.md,
           then follow the protocol EXACTLY: scan-only, single-pass, fail
           closed. Write canonical artifacts under .bug-hunter/. NEVER fix,
           never commit.",
  write: true, thinking: "high", background: false,
  task: "Adversarially scan the review diff (staged/working changes) for
         defects and vulnerabilities. Output the summary: confirmed /
         dismissed / manualReview counts + first evidence line per confirmed finding."
})
```
If the bug-hunter skill is not installed, skip with a note.

### Step 2: Judgment-based quality review

Run `git diff` to see what changed. Apply judgment-based review:

1. **Simplicity**: unnecessary abstractions, overcomplicated code
2. **Security**: untrusted input handling, SQL injection, open redirects
3. **Error handling**: swallowed errors, silent failures
4. **Surgical changes**: unnecessary modifications beyond task scope
5. **Domain/ADR fit**: conflicts with `.workflows/CONTEXT.md` terminology, domain rules, or accepted ADRs

High bar for findings — empty review = clean code = success.
Report P0-P3 issues with file paths and evidence.
Include human callouts (new deps, auth changes, migrations).

## Combined Output

```
## Review: PASS / FAIL

### Stage 1: Mechanical Verification
- agent-spec lifecycle: X/Y scenarios pass
- agent-spec guard: boundaries respected / violations
- Tests: pass / fail
- Lint: pass / fail
- Types: pass / fail
- Build: pass / fail

### Stage 2: Reviews (skipped if Stage 1 failed)
- Bug-hunter: <findings or clean>
- Quality review: <findings or "none">
- Human callouts: <list or "none">
```

$@
