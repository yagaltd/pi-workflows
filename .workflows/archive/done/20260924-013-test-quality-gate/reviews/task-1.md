# Task 1 — tdd-gate `--spec` input mode (plan 20260924-013)

## Round 1 — ok: false
- P0: exact-name coverage 2/3 missing ("preserves given-when-then step text" untitled; "hard errors when the agent-spec binary is missing" had extra "the"). Evidence: grep over test/spec.test.ts.
- Boundary context: 6 files, all src/** + test/** — clean.

## Fix round 1 (orchestrator-inline, Tier A — title-only renames, precedent 75daa43)
- test/spec.test.ts: two titles renamed to exact contract strings.

## Round 2 — ok: TRUE (reviewer pw13-t1-reviewer-r2)
- Layer 1: npm test 72/72 (11 files, pretest build clean); exact titles at test/spec.test.ts:8, :30, :40.
- Layer 1b: changed paths = {src/cli.ts, src/requirements.ts, src/spec.ts, test/cli.test.ts, test/fixtures/example.spec.md, test/spec.test.ts} ⊆ src/** + test/**.
- Layer 2a: tdd-guard lint 6/6 rules pass.
- Layer 2b: tdd-guard verify SKIPPED — known tool quirk (orchestrator-accepted): selector regex truncates to first word + default --tests dir mismatch; with `--tests test` verify exits 0, all selectors found:true.
- Layer 3: typecheck exit 0; build exit 0.
- Reviewer recommendation adopted for future rounds: canonical verify command gains `--tests test`.
