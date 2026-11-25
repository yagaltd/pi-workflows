# Review — task-1
Task: Doctrine + charter wiring · Contract: .workflows/specs/task-1.spec

## Round 1 — 2026-11-24 · reviewer
**ok: false**

Evidence:
- lifecycle 7/8; tdd-guard lint PASS and tdd-guard verify PASS 8/8.
- Isolated guard and verify line both fail on `test_rust_gate_no_forbidden_changes`; all other contracted behavior is present and green.
- Reviewer line budget 168 ≤170, no new heading, sentence outside nested domain-skills slice, no deslop-please skill entry.

### Findings
1. [P1] `tests/prompt-doctrine.test.ts` boundary guard checks only the dirty tree, but the extension commits worker diffs before the reviewer runs; the test then sees the contracted files as “forbidden churn” and its own Verify line goes red. Fix: union committed task-branch scope (`git diff --name-only HEAD~1 HEAD` or merge-base→HEAD) with the existing dirty/untracked sets, preserving every forbidden-path assertion.

## Round 2 — 2026-11-24 · reviewer (fix round)
**ok: true**

Evidence:
- lifecycle PASS 8/8 with lint,boundary,test,tdd-guard; tdd-guard lint PASS; tdd-guard verify PASS 6 decisions + 8 selectors.
- Isolated guard PASS; verify line PASS 112/0; agents-lint PASS; git diff --check PASS.
- Boundary guard now unions committed task branch scope with dirty/untracked files; negative probes for real forbidden paths still fail.
- Branch touches only tests/prompt-doctrine.test.ts; no test weakened. Orchestrator gates re-run with same result; tripwire OK [S1]/[S2].

No findings.

## Round 3 — 2026-11-24 · orchestrator integrated-tree gate
**ok: false**

Finding: [P1] The generic `templates/AGENTS.md` PROJECT guidance injected the literal canonical Rust gate sentence into every adopt charter, including non-Rust projects, breaking the byte-identical guarantee (`tests/init-extract.test.ts:469`, `test_adopt_non_rust_unchanged`). Root cause: the template must carry only a conditional pointer to the doctrine; the literal sentence belongs in the Rust-only charter assembly in `scripts/init-extract.ts` and in the doctrine files, not in the universal template.

Fix: remove the literal canonical sentence from the template PROJECT guidance; keep generic wording that says Rust projects add the gate described by init doctrine. Update the task-1 template assertion accordingly, without weakening any Rust-path pin.

## Round 3 fix verified — 2026-11-24
**ok: true**

Evidence: lifecycle PASS 8/8; tdd-guard lint/verify PASS; isolated guard PASS; `bun test tests/prompt-doctrine.test.ts tests/init-extract.test.ts` 135 pass / 0 fail; agents-lint PASS; git diff --check PASS. Universal template now carries only a generic conditional pointer; non-Rust adopt charters are byte-identical. Branch touches only the two Allowed paths; tripwire OK [S1]/[S2].
