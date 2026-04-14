---
name: add-feature
description: Build a well-defined feature from specification to shipped code with verification. Use when the user says "add feature", "implement", "build", "new feature", or describes a capability to add.
user-invocable: true
argument-hint: "<feature description or spec path>"
---

# Add Feature Workflow

Build a feature: understand the codebase → implement → verify deterministically → ship.

## Phase 1: SPEC

Ensure you know WHAT to build before writing code.

1. **If human provides a spec file**: Read it. Use it.
2. **If human describes a feature**: Write a brief spec inline:
   - **Goal**: What this feature does (1-2 sentences)
   - **Scope**: Which files/modules are in scope
   - **Completion criteria**: How we know it's done (testable conditions)
   - **Out of scope**: What we're explicitly NOT doing

Show the spec to the human. Get approval before proceeding.

🛑 **GATE**: Spec must be approved. Do NOT start building without it.

## Phase 2: RECON

Understand the existing codebase before changing it.

1. **Find related code**: `find`, `grep`/`rg`, read relevant files
2. **Understand patterns**: How are similar features implemented? What conventions exist?
3. **Map dependencies**: What does this feature touch? What depends on what?
4. **Check health**: Run existing test suite and linter to establish a green baseline.
   ```
   # Adapt to project:
   npm test          # or: cargo test, pytest, go test, etc.
   npm run lint      # or: cargo clippy, ruff check, etc.
   npm run typecheck # or: cargo check, mypy, etc.
   ```
   If baseline is RED, fix existing failures first or flag them.

**OUTPUT**: Context summary — patterns, files to change, conventions to follow.

## Phase 3: BUILD

Implement the feature.

1. **Write code**: Follow existing patterns and conventions discovered in RECON.
2. **Write tests**: At minimum, cover the completion criteria from the spec.
   - Unit tests for core logic
   - Integration tests for key paths
   - Edge cases: empty inputs, boundary values, error states
3. **Run deterministic checks** after each significant change:
   ```
   # Adapt to project:
   npm test          # All tests pass?
   npm run lint      # No lint errors?
   npm run typecheck # Types correct?
   npm run build     # Builds cleanly?
   ```
4. **Fix failures immediately**. Don't accumulate broken state.

**Internal gate**: All deterministic checks must pass before moving to VERIFY.

## Phase 4: VERIFY

Independent verification using deterministic tools. The reviewer is your toolchain.

Run the full verification suite:

```bash
# 1. Tests (must all pass)
npm test -- --coverage   # or equivalent with coverage

# 2. Lint (zero warnings)
npm run lint

# 3. Type check (zero errors)
npm run typecheck

# 4. Build (clean)
npm run build

# 5. Check for unintended changes
git diff --stat          # What files changed? Expected?
```

**Verification checklist**:
- [ ] All tests pass (including new ones)
- [ ] Zero lint warnings
- [ ] Zero type errors
- [ ] Build succeeds
- [ ] Only expected files changed
- [ ] Completion criteria from spec all met
- [ ] No regressions (pre-existing tests still pass)

If ANY check fails → go back to Phase 3, fix, re-verify.

**OUTPUT**: Structured verdict:
```
## Verification Result: PASS / FAIL

### Checks
- Tests: <X passed, Y failed>
- Lint: <clean / N warnings>
- Types: <clean / N errors>
- Build: <success / failed>

### Coverage
- New code covered: <yes/no/percentage>
- Edge cases tested: <list>

### Issues (if any)
- <issue 1>
- <issue 2>
```

## Phase 5: PRESENT

Show the human what was done.

Present:
```
## Feature: <name>

### What changed
- <file 1>: <what was done>
- <file 2>: <what was done>

### Tests added
- <test 1>: verifies <behavior>
- <test 2>: verifies <behavior>

### Verification
- Tests: ✅ all pass
- Lint: ✅ clean
- Types: ✅ clean
- Build: ✅ success
```

🛑 **STOP HERE.** Wait for human approval to commit.
Human decides: ship, revise, or add more tests.

## Rules

- **Spec first**: Never write code without knowing what "done" looks like.
- **Test to completion criteria**: Every completion criterion must have a test.
- **Deterministic verification**: Tests, lint, types, build. These are your reviewer.
- **Small commits**: Commit at logical checkpoints. Don't bundle everything into one giant commit.
- **Follow existing patterns**: Consistency beats cleverness. Match the codebase's style.
- **No scope creep**: If you discover related improvements, note them separately. Don't bundle them in.
- **Adapt commands**: The `npm` commands above are examples. Use whatever the project uses (cargo, pytest, go, make, etc.). Detect the project type automatically.
