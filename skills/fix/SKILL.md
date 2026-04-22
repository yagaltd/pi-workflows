---
name: fix
description: Find and fix bugs against a contract with root cause analysis and verification. Use when the user says "fix bug", "broken", "failing test", "error", "bug report", "incident", or "something is wrong".
user-invocable: true
argument-hint: "<bug description or error>"
---

# Fix Workflow

Reproduce → diagnose → fix within boundaries → verify with agent-spec → prevent. Find the root cause, not the symptom.

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

### Boundaries for the fix
<which files will be changed — keep scope minimal>

### Regression risk
<what could break from this fix>
```

🛑 **GATE**: Human must approve diagnosis and fix approach before proceeding.

## Phase 3: FIX

Minimal correction targeting the root cause within boundaries.

1. **Write the fix**: Smallest change that corrects the root cause. Don't refactor. Don't improve. Just fix.
2. **Add a regression test**: Write a test that would have caught this bug.
   - The test should fail BEFORE the fix and pass AFTER.
   - Test the specific edge case that caused the bug.
3. **Write a contract for the fix** (if complex):
   ```bash
   mkdir -p specs
   agent-spec init --level task --lang en --name "fix-<bug-name>"
   ```
   Fill in Intent (what's broken), Decisions (what changes), Boundaries (only the fix area), Completion Criteria (regression test scenario).
4. **Run deterministic checks**:
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

## Phase 4: VERIFY

Run in order. Stop at first failure.

### Layer 1: Contract verification (if contract exists)
```bash
agent-spec lifecycle specs/fix-<bug>.spec --code . --format json
agent-spec guard --spec-dir specs --code . --change-scope worktree
```
If fails → fix the fix. Don't proceed.

### Layer 2: Test quality (if tdd-guard installed)
```bash
tdd-guard lint --src src --tests tests --format json
```
If tdd-guard is not installed, skip and note it.

### Layer 3: Project verification
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
- [ ] agent-spec lifecycle passes (if contract created)
- [ ] agent-spec guard passes (only fix files changed)
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

### agent-spec (if applicable)
- Contract: <file or none>
- Scenarios: ✅ pass

### tdd-guard
- Lint: ✅ pass / ⏭️ skipped / ❌ fail

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

- **Reproduce first**: Never fix a bug you haven't reproduced. If you can't reproduce, say so.
- **Root cause, not symptom**: Fix why it broke, not just what's visible. A null check patches a symptom. Fixing why null reached that code fixes the root cause.
- **Minimal fix**: Smallest change that corrects the root cause. Don't bundle improvements.
- **Always add a regression test**: If the bug could happen again, it needs a test.
- **Boundaries**: Only change files relevant to the fix. Don't touch unrelated code.
- **No refactoring**: Fix phase is for fixing. Note refactor opportunities separately.
- **Deterministic verification**: agent-spec + tdd-guard + tests + lint + types + build. No "looks right to me."
- **Adapt commands**: Use whatever toolchain the project uses.

## UI Fix Variant

If the issue is visual/UI and pi-annotate is available:

1. Ask the user to run `/annotate <url>` (or `/annotate` for current tab)
2. User clicks broken elements, adds comments per element
3. User optionally enables "Etch" toggle to record style tweaks they try in DevTools
4. Receive structured annotation:
   - CSS selectors for each element
   - Box model (padding, border, margin, content size)
   - Accessibility info (role, name, ARIA states)
   - Key CSS styles (display, position, colors, typography)
   - Per-element screenshots with 20px padding
   - Edit capture diffs if user tweaked styles (before/after screenshots + property-level diffs)
   - User comments per element ("make this blue", "too much padding")
5. Map selectors to source files (grep for class names, IDs)
6. Apply fix directly from annotation data
7. Ask user to re-annotate to verify — faster than running full bombadil suite

If pi-annotate is not installed, fall back to text description + screenshot.
