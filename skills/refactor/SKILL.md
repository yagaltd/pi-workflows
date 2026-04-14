---
name: refactor
description: Restructure code without changing behavior. Use when the user says "refactor", "restructure", "rename", "extract module", "consolidate", "clean up architecture", or "reorganize".
user-invocable: true
argument-hint: "<scope or area to refactor>"
---

# Refactor Workflow

Change code structure WITHOUT changing behavior. Same outputs, better shape.

## Phase 1: ASSESS

Understand what needs to change and why.

1. **Clarify the refactoring goal**:
   - Why is this refactoring needed? (coupling, readability, testability, maintainability?)
   - What's the target state? (extract module, rename, consolidate, decouple?)

2. **Map the current structure**:
   - `find` relevant files and modules
   - `grep`/`rg` for imports, usages, dependencies
   - Read key files to understand coupling and interfaces
   - Draw a quick dependency map: who uses what

3. **Identify risk**:
   - How many files depend on the code being changed?
   - Are there public APIs that external consumers use?
   - How comprehensive is the existing test coverage?

4. **Establish behavioral baseline**:
   ```bash
   npm test          # Must be green before starting
   npm run lint      # Capture current state
   npm run typecheck
   npm run build
   ```
   If baseline is RED, fix first. Refactoring on a broken baseline is dangerous.

Present to the human:
```
## Refactoring: <scope>

### Current state
- <structure summary>
- <coupling: who depends on what>

### Proposed change
- <what will change>
- <what stays the same>

### Risk: LOW / MEDIUM / HIGH
- Files affected: <count>
- Dependencies: <count>
- Test coverage: <adequate / sparse / none>

### Steps (each leaves code in working state)
1. <step 1>
2. <step 2>
3. <step 3>
```

🛑 **GATE**: Human must approve scope and plan before execution begins.

## Phase 2: EXECUTE

Apply changes step by step. Each step must leave the code in a working state.

For each step:

1. **Make the change**: One logical refactoring move (rename, extract, move, consolidate).
2. **Run deterministic checks IMMEDIATELY**:
   ```bash
   npm test          # Must still pass
   npm run lint      # Must still pass
   npm run typecheck # Must still pass
   npm run build     # Must still build
   ```
3. **If any check fails**:
   - Revert the last change (`git checkout -- <files>` or `git stash`)
   - Adjust the approach
   - Try again. Do NOT accumulate broken state.

4. **Commit the step** (optional but recommended for safety):
   ```bash
   git add -A && git commit -m "refactor: <step N> — <what changed>"
   ```

This gives you a clean rollback point for every step.

## Phase 3: VERIFY

Confirm behavior is UNCHANGED after all refactoring steps.

```bash
# Full verification
npm test              # All tests pass (same as baseline)
npm run lint          # Clean (or same warnings as before)
npm run typecheck     # Clean
npm run build         # Clean build

# What changed
git diff --stat main  # Files changed summary
git diff main         # Full diff review

# Behavioral diff (if applicable)
# Run any golden tests, snapshot tests, or integration tests
```

**Verification checklist**:
- [ ] All tests pass (same tests as baseline — no new failures)
- [ ] No new lint warnings (refactoring shouldn't introduce warnings)
- [ ] No type errors
- [ ] Build succeeds
- [ ] No behavioral changes (same outputs for same inputs)
- [ ] Public APIs unchanged (or deliberately changed with migration)
- [ ] No performance regression (if measurable)

**Critical rule**: If tests pass but behavior changed, the tests are wrong. Investigate.

**OUTPUT**: Structured verdict:
```
## Refactor Verification: PASS / FAIL

### Structural changes
- <file 1>: moved to <location>
- <file 2>: extracted <function> from <module>
- <file 3>: renamed <X> to <Y>

### Behavioral check
- Tests: ✅ same tests pass
- Build: ✅ clean
- Lint: ✅ clean / same warnings as before

### Files changed: <N>
### Lines changed: +<A> / -<B>
```

If FAIL → go back to Phase 2, fix or rollback.

## Phase 4: PRESENT

Show the human what changed.

```
## Refactored: <scope>

### What changed
- <structural changes summary>

### Step-by-step
1. <step 1 description> ✅
2. <step 2 description> ✅
3. <step 3 description> ✅

### Verification
- Tests: ✅ all pass (no behavioral change)
- Lint: ✅ clean
- Types: ✅ clean
- Build: ✅ success

### Diff
<key changes, not the entire diff>
```

🛑 **STOP HERE.** Wait for human approval.
Human decides: keep or rollback.

## Rules

- **Behavior must not change**: If behavior changes, it's not a refactoring — it's a feature or a fix. Use the right workflow.
- **Steps, not leaps**: One refactoring move at a time. Verify after each. Small commits.
- **Never refactor on red**: If tests are failing, fix first. Refactor second.
- **Test coverage is your safety net**: If the code you're refactoring has no tests, write characterization tests FIRST (tests that capture current behavior). Then refactor.
- **Rollback is always available**: `git stash`, `git reset`, `git checkout`. Use them freely when a step goes wrong.
- **No scope creep**: Refactor what was agreed on. Note other improvements separately.
- **Deterministic verification only**: Tests, lint, types, build. Not "I think it's the same."
- **Adapt commands**: Use whatever toolchain the project uses.
