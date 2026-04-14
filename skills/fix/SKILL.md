---
name: fix
description: Find and fix bugs, failing tests, errors, and production issues with root cause analysis. Use when the user says "fix bug", "broken", "failing test", "error", "bug report", "incident", or "something is wrong".
user-invocable: true
argument-hint: "<bug description or error>"
---

# Fix Workflow

Reproduce → diagnose → fix → verify → prevent. Find the root cause, not the symptom.

## Phase 1: REPRODUCE

Confirm the problem exists before trying to fix it.

1. **Understand the report**: What's the error? When does it happen? What's expected vs actual?
2. **Find the relevant code**: `grep`/`rg` for error messages, function names, file paths mentioned in the stack trace.
3. **Reproduce it**:
   - Run the failing test: `npm test -- <test-file>` or equivalent
   - If no test: write a minimal reproduction script
   - Capture the exact error output

If you **cannot reproduce**:
- Ask the human for more context (input data, environment, steps)
- 🛑 **STOP** if reproduction is impossible. Don't fix what you can't confirm is broken.

**OUTPUT**: Confirmed reproduction with exact error output.

## Phase 2: DIAGNOSE

Find the ROOT CAUSE, not just the symptom.

1. **Trace backward from the error**:
   - Where does the error originate?
   - What function/path leads there?
   - What input/state causes the failure?

2. **Check recent changes**:
   ```bash
   git log --oneline -20            # Recent commits
   git diff HEAD~5..HEAD -- <area>  # Recent changes in relevant area
   ```

3. **Check for similar patterns that work**:
   - Is there a similar code path that handles this correctly?
   - What's different about the failing path?

4. **Form a hypothesis**: ONE testable theory about the root cause.

Present to the human:
```
## Diagnosis

### Root cause
<what's actually broken and why>

### Evidence
- <trace/log/diff that supports this>

### Proposed fix
<minimal change to correct the root cause>

### Regression risk
<what could break from this fix>
```

🛑 **GATE**: Human must approve diagnosis and fix approach before proceeding.

## Phase 3: FIX

Minimal correction targeting the root cause.

1. **Write the fix**: Smallest change that corrects the root cause. Don't refactor. Don't improve. Just fix.
2. **Add a regression test**: Write a test that would have caught this bug.
   - The test should fail BEFORE the fix and pass AFTER.
   - Test the specific edge case that caused the bug.
3. **Run deterministic checks**:
   ```
   npm test          # Bug fix test passes? No regressions?
   npm run lint      # Clean?
   npm run typecheck # Clean?
   npm run build     # Builds?
   ```
4. **Verify the original reproduction is fixed**: Re-run Phase 1's reproduction. It should now pass.

If checks fail → fix the fix. Don't proceed with broken state.

## Phase 4: VERIFY

Full verification that the fix works and nothing else broke.

```bash
# Full test suite (not just the new test)
npm test

# Lint
npm run lint

# Type check
npm run typecheck

# Build
npm run build

# Check what changed
git diff --stat
```

**Verification checklist**:
- [ ] Original bug is fixed (reproduction passes)
- [ ] Regression test added and passes
- [ ] All pre-existing tests still pass (no regressions)
- [ ] Zero lint warnings
- [ ] Zero type errors
- [ ] Build succeeds
- [ ] Fix is minimal (no unrelated changes)

**OUTPUT**: Structured verdict:
```
## Fix Verification: PASS / FAIL

### Bug: <description>
- Reproduction: ✅ fixed / ❌ still fails
- Root cause: <what was wrong>
- Fix: <what was changed>

### Regression test
- <test name>: verifies <edge case>

### All checks
- Tests: ✅ / ❌
- Lint: ✅ / ❌
- Types: ✅ / ❌
- Build: ✅ / ❌
```

## Phase 5: PREVENT

Document the fix to prevent recurrence.

1. **Commit message** should include:
   ```
   fix: <what was broken>
       
       Root cause: <why it broke>
       Fix: <what changed>
       Test: <regression test added>
   ```

2. **If the pattern is systemic** (same mistake could exist elsewhere):
   - `grep` for similar patterns in the codebase
   - Flag them to the human: "This same pattern exists in <files>. Should I fix those too?"

3. **Present to the human**:
   ```
   ## Fixed: <bug>

   Root cause: <why>
   Change: <file> — <what>
   Regression test: <test name>

   All checks passing ✅
   ```

🛑 **STOP HERE.** Wait for human approval to commit.

## Rules

- **Reproduce first**: Never fix a bug you haven't reproduced. If you can't reproduce it, say so.
- **Root cause, not symptom**: Fix why it broke, not just what's visible. A null check patches a symptom. Fixing why null reached that code fixes the root cause.
- **Minimal fix**: Smallest change that corrects the root cause. Don't bundle improvements.
- **Always add a regression test**: If the bug could happen again, it needs a test.
- **No refactoring**: Fix phase is for fixing. Note refactor opportunities separately.
- **Deterministic verification**: Tests, lint, types, build. No "looks right to me."
- **Adapt commands**: Use whatever toolchain the project uses.
