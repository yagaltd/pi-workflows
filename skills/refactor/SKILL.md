---
name: refactor
description: Restructure code against a contract without changing behavior. Use when the user says "refactor", "restructure", "rename", "extract module", "consolidate", "clean up architecture", or "reorganize".
user-invocable: true
argument-hint: "<scope or area to refactor>"
---

# Refactor Workflow

Change code structure WITHOUT changing behavior. Same outputs, better shape. Verify with agent-spec that behavior is preserved.

## Phase 1: ASSESS

Understand what needs to change and why.

1. **Clarify the refactoring goal**:
   - Why is this refactoring needed? (coupling, readability, testability, maintainability?)
   - What's the target state? (extract module, rename, consolidate, decouple?)

2. **Map the current structure**:
   - Read domain memory if present: `.workflows/CONTEXT.md`, `.workflows/CONTEXT-MAP.md`, relevant `.workflows/docs/adr/*.md`
   - `find` relevant files and modules
   - `grep`/`rg` for imports, usages, dependencies
   - Read key files to understand coupling and interfaces
   - Draw a quick dependency map: who uses what

3. **Check domain/ADR constraints**:
   - Use glossary terms from `.workflows/CONTEXT.md` when describing modules and behavior
   - Flag user terminology that conflicts with project language
   - Flag refactors that contradict accepted ADRs before proposing them

4. **Identify risk**:
   - How many files depend on the code being changed?
   - Are there public APIs that external consumers use?
   - How comprehensive is the existing test coverage?

5. **Establish behavioral baseline**:
   ```bash
   npm test          # Must be green before starting
   npm run lint      # Capture current state
   npm run typecheck
   npm run build
   ```
   If baseline is RED, fix first. Refactoring on a broken baseline is dangerous.

6. **Write a refactoring contract**:

   ```bash
   mkdir -p .workflows/specs
   agent-spec init --level task --lang en --name "refactor-<scope>"
   ```
   
   The contract for refactoring is special — it verifies behavior is PRESERVED:

   ```spec
   spec: task
   name: "Refactor: <scope>"
   tags: [refactor]
   ---

   ## Intent

   Restructure <area> for <reason>. Behavior must not change.

   ## Decisions

   - Public API signatures remain unchanged
   - All existing tests must still pass
   - No new functionality added

   ## Boundaries

   ### Allowed Changes
   - <files to restructure>

   ### Forbidden
   - Do not change public API contracts
   - Do not modify test files (tests verify behavior preservation)
   - Do not change external interfaces

   ## Completion Criteria

   Scenario: Existing behavior preserved
     Test: test_existing_<area>_behavior_unchanged
     Given the full test suite passes before refactoring
     When the refactoring is complete
     Then all pre-existing tests still pass
     And no behavioral changes detected

   Scenario: Structure improved
     Test: test_refactored_<area>_structure
     Given the refactored code
     When checking module boundaries
     Then <target structural property holds>
   ```

Present to the human:
```
## Refactoring: <scope>

### Current state
- <structure summary>
- <coupling: who depends on what>

### Proposed change
- <what will change>
- <what stays the same>

### Contract: .workflows/specs/refactor-<scope>.spec
- Boundaries: <files in scope>
- Key invariant: behavior must not change

### Risk: LOW / MEDIUM / HIGH
- Files affected: <count>
- Dependencies: <count>
- Test coverage: <adequate / sparse / none>

### Steps (each leaves code in working state)
1. <step 1>
2. <step 2>
3. <step 3>
```

🛑 **GATE**: Human must approve scope, contract, and plan before execution begins.

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

### Contract verification
```bash
# Verify the refactoring contract
agent-spec lifecycle .workflows/specs/refactor-<scope>.spec --code . --format json

# Check boundaries — only allowed files changed
agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
```

### Project verification
```bash
# Full verification
npm test              # All tests pass (same as baseline)
npm run lint          # Clean (or same warnings as before)
npm run typecheck     # Clean
npm run build         # Clean build

# What changed
git diff --stat main  # Files changed summary
git diff main         # Full diff review
```

**Verification checklist**:
- [ ] agent-spec lifecycle passes
- [ ] agent-spec guard passes (only allowed files changed)
- [ ] All tests pass (same tests as baseline — no new failures)
- [ ] No new lint warnings (refactoring shouldn't introduce warnings)
- [ ] No type errors
- [ ] Build succeeds
- [ ] No behavioral changes (same outputs for same inputs)
- [ ] Public APIs unchanged (or deliberately changed with migration)

**Critical rule**: If tests pass but behavior changed, the tests are wrong. Investigate.

**OUTPUT**: Structured verdict:
```
## Refactor Verification: PASS / FAIL

### Contract
- agent-spec lifecycle: ✅ pass / ❌ fail
- Boundaries: ✅ respected

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

### Contract
- Spec: .workflows/specs/refactor-<scope>.spec
- agent-spec lifecycle: ✅ all pass
- Boundaries: ✅ respected

### What changed
- <structural changes summary>

### Step-by-step
1. <step 1 description> ✅
2. <step 2 description> ✅
3. <step 3 description> ✅

### Verification
- agent-spec: ✅ contract satisfied
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
- **agent-spec verifies boundaries**: The guard catches any accidental changes outside allowed files.
- **Deterministic verification only**: agent-spec + tests + lint + types + build. Not "I think it's the same."
- **Adapt commands**: Use whatever toolchain the project uses.
