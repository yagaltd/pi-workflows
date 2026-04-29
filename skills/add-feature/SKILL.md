---
name: add-feature
description: Build a feature against a contract from specification to shipped code with verification. Use when the user says "add feature", "implement", "build", "new feature", or describes a capability to add.
user-invocable: true
argument-hint: "<feature description or spec path>"
---

# Add Feature Workflow

Execute an approved contract. Small surgical requests may create a contract after mini-recon. Broad ideas must route to `/idea`.

## Phase 0: CLASSIFY INPUT

Decide which path applies before writing code.

1. **Approved `.spec` path provided** → execute that contract.
2. **Broad or ambiguous feature idea** → stop and route to `/idea`.
   - Broad signals: unclear behavior, multiple screens/modules, data model choice, API design, architecture tradeoff, unknown scope, or user says "figure it out".
3. **Small surgical request** → mini-recon first, then create a contract and ask approval.
   - Surgical signals: one known command/flag/field/endpoint, narrow behavior, likely few files, no architecture choice.

If unsure, treat as broad and route to `/idea`.

## Phase 1: SPEC

Ensure you have an evidence-backed contract before writing code.

1. **If a `.spec` file exists**: Read it with `agent-spec contract <spec>`. This is your contract. Follow it.
2. **If no spec but request is broad**: Stop. Say: "This needs `/idea` first so we can explore, resolve decisions, and write contracts."
3. **If no spec but request is small/surgical**: run mini-recon BEFORE creating a contract:
   - read `CONTEXT.md`, `CONTEXT-MAP.md`, and relevant `docs/adr/*.md` if present
   - find related code/tests with `find` and `rg`
   - identify existing patterns and exact files likely in scope
   - check cheap baseline tests if relevant

Then create a contract:

```bash
mkdir -p specs
agent-spec init --level task --lang en --name "<feature-name>"
```

Fill in from evidence:
- **Intent**: what this feature does (1-3 sentences)
- **Decisions**: technical choices fixed by repo patterns or user answers
- **Boundaries**: exact files/globs allowed and forbidden
- **Completion Criteria**: BDD scenarios with explicit test selectors

Show the contract and mini-recon evidence to the human. Get approval before proceeding.

🛑 **GATE**: Contract must be approved. Do NOT start building without it.

## Phase 2: RECON

Understand the existing codebase before changing it.

1. **Read the contract boundaries**: Know exactly which files are in scope
2. **Find related code**: `find`, `grep`/`rg` within allowed paths
3. **Understand patterns**: How are similar features implemented?
4. **Map dependencies**: What does this feature touch?
5. **Check health**: Establish a green baseline
   ```
   # Adapt to project:
   npm test          # or: cargo test, pytest, etc.
   npm run lint      # or: cargo clippy, ruff check, etc.
   npm run typecheck # or: cargo check, mypy, etc.
   ```
   If baseline is RED, fix existing failures first or flag them.

**OUTPUT**: Context summary — patterns, files to change, conventions to follow.

## Phase 3: BUILD

Implement the feature within contract boundaries.

1. **Follow the contract's Decisions** — don't re-decide what's already fixed
2. **Stay within Boundaries** — only change Allowed files. Never touch Forbidden files.
3. **Write code** following existing patterns and conventions
4. **Write tests** for EVERY scenario in Completion Criteria:
   - Each BDD scenario → one test function with the exact name from `Test:` selector
   - Unit tests for core logic
   - Edge cases: empty inputs, boundary values, error states
5. **Self-verify after each change**:
   ```
   npm test          # All tests pass?
   npm run lint      # No lint errors?
   npm run typecheck # Types correct?
   npm run build     # Builds cleanly?
   ```
4. **Fix failures immediately**. Don't accumulate broken state.

**Internal gate**: All checks pass before moving to VERIFY.

## Phase 4: VERIFY

### Layer 1: Contract verification (agent-spec)

```bash
# Verify against the contract
agent-spec lifecycle <spec> --code . --format json

# Check boundaries
agent-spec guard --spec-dir specs --code . --change-scope worktree
```
If any scenario fails or boundaries violated → go back to Phase 3, fix, re-verify.

### Layer 2: Test quality (tdd-guard, if installed)

```bash
tdd-guard lint --src src --tests tests --format json
tdd-guard spec-verify --spec <spec> --format json
```
If tdd-guard is not installed, skip and note it. If any rule fails → go back to Phase 3.

### Layer 3: Project verification

```bash
# Full suite
npm test -- --coverage   # or equivalent
npm run lint              # zero warnings
npm run typecheck         # zero errors
npm run build             # clean

# Check for unintended changes
git diff --stat
```

### Optional: UI Verification

If the feature has a UI component:
- **Quick check**: Ask user to `/annotate` and verify elements look correct
- **Full check**: Run bombadil test suite (if installed)
- **Skip**: If no UI or UI is trivial

**Verification checklist**:
- [ ] agent-spec lifecycle passes (all scenarios pass)
- [ ] agent-spec guard passes (boundaries respected)
- [ ] tdd-guard passes (test quality verified) or skipped (not installed)
- [ ] bombadil passes (if web UI)
- [ ] All tests pass (including new ones)
- [ ] Zero lint warnings
- [ ] Zero type errors
- [ ] Build succeeds
- [ ] Only expected files changed

**OUTPUT**: Structured verdict:
```
## Contract Verification: PASS / FAIL

### agent-spec lifecycle
- Contract: <spec file>
- Scenarios: X passed, Y failed
- Boundaries: ✅ respected

### bombadil (if applicable)
- Properties: ✅ all hold / ❌ N violations

### Project checks
- Tests: <X passed, Y failed>
- Lint: <clean / N warnings>
- Types: <clean / N errors>
- Build: <success / failed>
```

## Phase 5: PRESENT

Show the human what was done.

Present:
```
## Feature: <name>

### Contract
- Spec: <file>
- Scenarios: X/Y passing
- Boundaries: respected

### What changed
- <file 1>: <what was done>
- <file 2>: <what was done>

### Tests added
- <test 1>: verifies <scenario from contract>
- <test 2>: verifies <scenario from contract>

### Verification
- agent-spec lifecycle: ✅ all pass
- Tests: ✅ all pass
- Lint: ✅ clean
- Types: ✅ clean
- Build: ✅ success
```

🛑 **STOP HERE.** Wait for human approval to commit.
Human decides: ship, revise, or add more tests.

## Rules

- **Contract first**: Never write code without a contract. The contract defines "done."
- **Boundaries are hard limits**: Only change allowed files. agent-spec verifies this.
- **Test to completion criteria**: Every BDD scenario in the contract must have a test.
- **agent-spec lifecycle is your verification**: Run it yourself. Don't make the reviewer catch failures.
- **Small commits**: Commit at logical checkpoints. Don't bundle everything into one giant commit.
- **Follow existing patterns**: Consistency beats cleverness. Match the codebase's style.
- **No scope creep**: If you discover related improvements, note them separately. Don't bundle them in.
- **Adapt commands**: The `npm` commands above are examples. Use whatever the project uses.
