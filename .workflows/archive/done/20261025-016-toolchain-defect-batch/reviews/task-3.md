# Task 3 — tdd-guard no-assertionless-tests fix + 0.1.1 (plan 20261025-016)

## Round 1 — FINAL — ok: TRUE (reviewer pw16-t3-reviewer)
- KEY FINDING (beyond contract): the acceptance "0 findings" was VACUOUS pre-fix — acorn crashed on pi-workflows tests/extension.test.ts L440 (lexical redeclaration, TS-illegal/bun-legal) → extractTestBlocks silently returned [] → all rules blind, not clean. Worker added @babel/parser errorRecovery fallback: 97 blocks extracted (was 0), 0 findings — non-vacuous.
- Layer 1: 5/5 contract fixtures pass (destructuring-from-call, template interpolation, nested literals, unicode identifiers, assertionless control still flagged). parse exit 0; lint 0 ERROR; lifecycle 5/5 Skip accepted (backlog item 11 = toolchain defect batch: agent-spec fork Node-verifier port, guard per-spec scoping, tdd-guard lint parser fix, canonical --tests <dir> verify).
- Layer 1b: committed diff ⊆ allowed (package.json, src/parser.ts, tests/**); the node_modules symlink + tool-matcher quirks documented, not violations.
- Layer 2: clone suite 11/12 — sole fail proven pre-existing + environmental (.git path filter under .git/subagents cwd; passes at base from real checkout).
- Layer 3: acceptance lint on the real corpus: 0 violations; version 0.1.1; per-class fixtures present.
- Worker-reported out-of-scope items (for item 11 follow-up): lint.ts .git-path filter excludes worktree files; vitest.config exclude lacks .git/subagents/**.

## Merge record (appended at archive prep)
- Merged: `git merge --no-ff subagents/run_mvnqiktj_pgf0oh/worker-3` → tdd-guard main @ 9d6b49d (v0.1.1). Post-merge: clone suite green; acceptance lint 0 no-assertionless findings on the pi-workflows corpus.
