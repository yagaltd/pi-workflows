# Review — task-7
Task: Docs, gates, launcher, release · Contract: .workflows/specs/task-7.spec

## Round 1 — 2026-11-23 · reviewer
**ok: true**

Evidence:
- lifecycle PASS 5/5; verify line PASS: 43 tests pass / 1 pre-existing skip / 0 fail; docs-lint CLEAN; check-drift CLEAN.
- Launcher/mise wiring and generated README table verified; CHANGELOG contains `20261123-075`.
- Branch diff touches exactly 13 Allowed Changes files; forbidden paths untouched.
- Tripwire OK [S1]/[S2] after claiming only actual diff files.

No findings.

## Round 2 — 2026-11-23 · orchestrator final review
**ok: false**

Findings:
1. [P1] README contains literal `[[...]]` tokens from TASK 7 docs; `tests/prompt-doctrine.test.ts:1053` requires clean markdown and pinned pi-emphasis phrases — evidence: full `bun test` fail.
2. [P1] Docs-lint budgets rose (`docs/architecture.md` markdownlint 28→30, total 342→343; harper README 47→50, architecture 60→68) — evidence: `tests/prompt-doctrine.test.ts:1088,1116` fail; budget ratchet requires no rise.
3. [P1] CHANGELOG top entry declares v0.15.20 while `package.json` remains 0.15.20? no — remains 0.15.19 — evidence: `tests/ship-wiring.test.ts:20` fail.

Fix round: worker role, expanded Allowed Changes includes `package.json`; re-review with full suite.

Fix-round authorization: `tests/gen-docs.test.ts:92-96` literal-token assertion aligned to canonical prompt-doctrine (plain-word names + vocabulary reference); prompt-doctrine `[[` ban stands. This is doctrine alignment, not test weakening.

## Round 2 adjudication — 2026-11-23 · orchestrator
Both Round-2 re-review findings are contract/authorization-owned, not worker defects:
1. The spec scenario citation to `templates/STATUS-VOCABULARY.md` was added by the orchestrator during fix authorization and sits outside TASK 7 Allowed Changes. Removed from the spec scenario wording; the README itself still cites the mapping, as required by prompt-doctrine.
2. The re-review prompt's "does not modify tests" clause contradicted the recorded fix authorization for `tests/gen-docs.test.ts:92-96`. The authorized assertion alignment stands; the re-review will be re-run with that exception stated.
No additional worker fix round is authorized (max-rounds 2 exhausted); this is a contract correction plus fresh re-review of the same fix delta.

## Round 3 — 2026-11-23 · reviewer (fresh re-review after adjudication)
**ok: true**

Evidence:
- lifecycle PASS 4/4; full `bun test` 816 pass / 9 skip / 0 fail; docs-lint CLEAN; check-drift CLEAN.
- Diff `2bee978..b881b24`: README.md, docs/architecture.md, package.json, scripts/docs-lint-baseline.json, tests/gen-docs.test.ts — all authorized (gen-docs exception recorded).
- Round-2 findings fixed in repo truth: README plain-word status names, baseline budgets at or below pre-task7 reference, package.json 0.15.20 matches CHANGELOG.
- Tripwire OK [S1]/[S2].

No findings.
